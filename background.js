// CREATING OFFSCREEN
let creatingOffscreen = null;

async function ensureOffscreen() {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");

  // Check if offscreen document already exists
  if ("getContexts" in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });

    if (contexts.length > 0) {
      console.log("Offscreen document already exists");
      return;
    }
  } else {
    I;
    // Fallback for older Chrome versions
    const clients = await self.clients.matchAll();
    if (clients.some((client) => client.url.includes(chrome.runtime.id))) {
      return;
    }
  }

  // Create offscreen document
  // put a good looking 'justification' here because they will review it
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WORKERS"],
      justification:
        "Maintain persistent data structures for extension functionality",
    });

    await creatingOffscreen;
    creatingOffscreen = null;
    console.log("Offscreen document created successfully");
  } else {
    await creatingOffscreen;
  }
}

// Create offscreen on browser startup
chrome.runtime.onStartup.addListener(() => {
  ensureOffscreen();
  console.log("Extension started, offscreen document ensured");
});

// Create offscreen on extension installation
chrome.runtime.onInstalled.addListener(() => {
  ensureOffscreen();
  console.log("Extension installed, offscreen document created");
});

// Handle messages (from content script) to ensure offscreen exists
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "ensure_offscreen") {
    ensureOffscreen()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

/**
 *
 * @param {String} pinnedTab
 * @returns {Promise<String>}
 * send message to offscreen document to lower the audio output volume
 * of pinned tab to preset volume value
 */
async function lowerPinnedTabVolume(pinnedTab) {
  let mediaId = await chrome.storage.session.set({ mediaId: mediaId });
  // capture media stream if it hasnt been captured
  if (mediaId === undefined) {
    mediaId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: pinnedTab,
    });
    // media stream is only captured once, so store in session storage after captured
    await chrome.storage.session.set({ mediaId: mediaId });
  }

  // call to offscreen document to lower pinned tab's audio output
  chrome.runtime.sendMessage(
    {
      type: "LOWER_TO_BACKGROUND_VOLUME",
      mediaId: mediaId,
    },
    (res) => console.log(res),
  );
}

function resetPinnedTabVolume() {
  chrome.runtime.sendMessage({ type: "RESET_TO_ORIGINAL_VOLUME" });
}

// DETECTING AUDIO
// detect if there're other audible tabs other than pinned tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const pinnedTab = chrome.storage.session
    .get("pinnedTab")
    .then(({ pinnedTab }) => pinnedTab);
  if (tabId !== pinnedTab && changeInfo.audible == true)
    lowerPinnedTabVolume(pinnedTab);
  if (tabId !== pinnedTab && changeInfo.audible == false)
    resetPinnedTabVolume();
});

// detect if pinned tab is the currently the only audible tab
