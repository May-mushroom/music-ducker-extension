export const YT_PATTERN = 'https://www.youtube.com/*';
export const isYT = (url) => !!url && url.startsWith('https://www.youtube.com/');

export const DEFAULT_VOLUMES = { normal: 1, background: 0.3 };

export const MSG = {
  PIN: 'PIN',                     // popup -> bg: pin this tab now (popup was opened on it)
  PREPARE_PIN: 'PREPARE_PIN',     // popup -> bg: focus tab, ask user to click the icon again
  UNPIN: 'UNPIN',
  SET_VOLUMES: 'SET_VOLUMES',
  START_CAPTURE: 'START_CAPTURE', // bg -> offscreen
  SET_GAIN: 'SET_GAIN',
  STOP_CAPTURE: 'STOP_CAPTURE',
  CAPTURE_ENDED: 'CAPTURE_ENDED', // offscreen -> bg
};

// Slider values are absolute levels (0-1). The captured audio already includes the
// player's own volume (pinVolume), so gain = level / pinVolume.
export const gainFor = (level, pinVolume) => Math.min(level / Math.max(pinVolume, 0.01), 4);

export const send = (msg) => chrome.runtime.sendMessage(msg);
