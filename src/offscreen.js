import { MSG } from './shared.js';

let ctx = null, gainNode = null, stream = null;

function stop() {
  stream?.getTracks().forEach((t) => { t.onended = null; t.stop(); });
  ctx?.close();
  ctx = gainNode = stream = null;
}

async function start(streamId, gain) {
  stop();
  stream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
  });
  ctx = new AudioContext();
  gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  // Must route back to the speakers, otherwise capturing mutes the tab.
  ctx.createMediaStreamSource(stream).connect(gainNode).connect(ctx.destination);
  stream.getAudioTracks()[0].onended = () => {
    stop();
    chrome.runtime.sendMessage({ type: MSG.CAPTURE_ENDED });
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;
  switch (msg.type) {
    case MSG.START_CAPTURE:
      start(msg.streamId, msg.gain)
        .then(() => sendResponse({ ok: true }))
        .catch((e) => sendResponse({ ok: false, error: e.message }));
      return true;
    case MSG.SET_GAIN:
      if (gainNode) gainNode.gain.setTargetAtTime(msg.gain, ctx.currentTime, 0.05); // ramp, no clicks
      break;
    case MSG.STOP_CAPTURE:
      stop();
      break;
  }
});
