// Perform heavy processing or maintain persistent state
console.log("hey human!, your offscreen document is live");

// Listen for messages from the background script or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOWER_TO_BACKGROUND_VOLUME") {
    lowerToBgVolume(message.mediaId);
    sendResponse("FROM OFFSCREEN: done");
  }

  if (message.type === "RESET_TO_ORIGINAL_VOLUME") releaseStream();
});

async function lowerToBgVolume(mediaId) {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: mediaId,
      },
    });
    const audioContext = new AudioContext();
    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    const gainNode = audioContext.createGain();
    // compute gain value
    let gainValue = await chrome.storage.session.get("bgVolume");
    gainNode.gain.value = Math.floor(gainValue / 100);
    sourceNode.connect(gainNode).connect(audioContext.destination);
  } catch (err) {
    console.error(err);
  }
}
async function releaseStream() {
  try {
    const { mediaId } = await chrome.storage.session.get("mediaId");
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: mediaId,
        },
      },
    });
    mediaStream?.getTracks().forEach((track) => track.stop());
    await chrome.storage.session.remove("mediaId");
  } catch (error) {
    console.log(error);
  }
}
