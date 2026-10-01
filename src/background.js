import { YT_PATTERN, isYT, MSG, DEFAULT_VOLUMES, gainFor } from './shared.js';

const store = chrome.storage.session;
const RESTORE_DELAY = 500;
let restoreTimer = null;

// ---------- state ----------
async function getState() {
  const s = await store.get(['backgroundTab', 'volumes', 'pinVolume']);
  return {
    tab: s.backgroundTab ?? null,
    volumes: s.volumes ?? DEFAULT_VOLUMES,
    pinVolume: s.pinVolume ?? 1,
  };
}

// ---------- offscreen ----------
const toOffscreen = (msg) => chrome.runtime.sendMessage({ target: 'offscreen', ...msg });

async function ensureOffscreen() {
  const ctxs = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (ctxs.length) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
    justification: 'Capture the pinned tab audio and play it back through a gain node.',
  });
}

// ---------- ducking ----------
async function applyGain(ducked) {
  const { tab, volumes, pinVolume } = await getState();
  if (!tab) return;
  const gain = gainFor(ducked ? volumes.background : volumes.normal, pinVolume);
  console.log('[ducker] gain ->', gain.toFixed(2), ducked ? '(ducked)' : '(normal)');
  await toOffscreen({ type: MSG.SET_GAIN, gain }).catch((e) => console.warn('[ducker] SET_GAIN failed', e));
}

// Stateless: recompute from the current audible YouTube tabs (survives worker restarts).
// Refreshes are serialized so overlapping events can't apply results out of order.
let queue = Promise.resolve();
const refresh = (immediate = false) =>
  (queue = queue.then(() => doRefresh(immediate)).catch(console.error));

// While ducked, re-check every second so a missed or stale audible event can't leave us stuck.
let pollTimer = null;
const startPoll = () => { if (!pollTimer) pollTimer = setInterval(() => refresh(), 1000); };
const stopPoll = () => { clearInterval(pollTimer); pollTimer = null; };

async function doRefresh(immediate) {
  const { tab } = await getState();
  if (!tab) return stopPoll();
  const audible = await chrome.tabs.query({ audible: true, url: YT_PATTERN });
  const othersAudible = audible.some((t) => t.id !== tab.id);

  if (othersAudible) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
    startPoll();
    await applyGain(true);
  } else if (immediate) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
    stopPoll();
    await applyGain(false);
  } else if (!restoreTimer) {
    restoreTimer = setTimeout(() => {
      restoreTimer = null;
      stopPoll();
      applyGain(false);
    }, RESTORE_DELAY);
  }
}

// ---------- pin / unpin ----------
async function pin(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isYT(tab.url)) throw new Error('Only https://www.youtube.com/ tabs can be pinned.');

  // Read (never write) the player's current volume.
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.querySelector('video')?.volume ?? 1,
  });
  const pinVolume = result ?? 1;

  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  await ensureOffscreen();
  const res = await toOffscreen({ type: MSG.START_CAPTURE, streamId, gain: 1 });
  if (!res?.ok) {
    chrome.offscreen.closeDocument().catch(() => {});
    throw new Error(res?.error || 'Could not capture tab audio.');
  }

  const prev = (await store.get('volumes')).volumes;
  const volumes = {
    normal: pinVolume,
    background: Math.min(prev?.background ?? DEFAULT_VOLUMES.background, pinVolume),
  };
  await store.set({
    backgroundTab: { id: tab.id, title: tab.title, favIconUrl: tab.favIconUrl, url: tab.url },
    volumes,
    pinVolume,
  });
  await store.remove('pendingPin');
  refresh(true);
}

async function unpin() {
  clearTimeout(restoreTimer);
  restoreTimer = null;
  stopPoll();
  await store.remove(['backgroundTab', 'pinVolume']);
  await toOffscreen({ type: MSG.STOP_CAPTURE }).catch(() => {});
  chrome.offscreen.closeDocument().catch(() => {});
}

// Focus the tab and tell the user to click the icon again (grants activeTab for capture).
async function preparePin(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isYT(tab.url)) throw new Error('Only https://www.youtube.com/ tabs can be pinned.');
  await store.set({ pendingPin: tabId });
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  showToast(tabId);
}

// Runs inside the page (must be self-contained).
function injectToast() {
  const el = document.createElement('div');
  el.textContent = 'Music Ducker: click the extension icon to finish pinning this tab.';
  el.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:2147483647;max-width:280px;padding:12px 16px;' +
    'background:#1f2937;color:#fff;font:14px/1.4 system-ui,sans-serif;border-radius:8px;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.4);transform:translateX(120%);transition:transform .3s ease';
  document.documentElement.appendChild(el);
  requestAnimationFrame(() => (el.style.transform = 'translateX(0)'));
  setTimeout(() => { el.style.transform = 'translateX(120%)'; setTimeout(() => el.remove(), 400); }, 8000);
}

async function showToast(tabId) {
  const t = await chrome.tabs.get(tabId).catch(() => null);
  if (!t) return;
  if (t.status !== 'complete') {
    const onDone = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onDone);
        showToast(tabId);
      }
    };
    chrome.tabs.onUpdated.addListener(onDone);
    return;
  }
  chrome.scripting.executeScript({ target: { tabId }, func: injectToast }).catch(() => {});
}

// Capture died (e.g. the pinned tab was reloaded): unpin and ask the user to re-grant.
async function onCaptureEnded() {
  const { tab } = await getState();
  if (!tab) return;
  await unpin();
  const t = await chrome.tabs.get(tab.id).catch(() => null);
  if (t && isYT(t.url)) {
    await store.set({ pendingPin: tab.id });
    showToast(tab.id);
  }
}

// ---------- events ----------
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  const { tab } = await getState();
  if (!tab) return;
  if (tabId === tab.id) {
    if (info.url && !isYT(info.url)) return unpin();
    if (info.title) store.set({ backgroundTab: { ...tab, title: info.title } });
    return;
  }
  if (info.audible !== undefined || info.url) refresh();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { tab } = await getState();
  const { pendingPin } = await store.get('pendingPin');
  if (pendingPin === tabId) store.remove('pendingPin');
  if (tab?.id === tabId) unpin();
  else refresh();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target === 'offscreen') return;
  (async () => {
    try {
      switch (msg.type) {
        case MSG.PIN: await pin(msg.tabId); break;
        case MSG.PREPARE_PIN: await preparePin(msg.tabId); break;
        case MSG.UNPIN: await unpin(); break;
        case MSG.SET_VOLUMES:
          await store.set({ volumes: msg.volumes });
          await refresh(true);
          break;
        case MSG.CAPTURE_ENDED: await onCaptureEnded(); break;
      }
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true;
});
