import React, { useEffect, useState } from "react";

function PinnedTabPage({
  bgTab,
  setBgTab,
  bgVolume,
  setBgVolume,
  regularVolume,
  setRegularVolume,
}) {
  const [tabTitle, setTabTitle] = useState(null);
  useEffect(() => {
    chrome.tabs.get(bgTab).then((tab) => setTabTitle(tab.title));
  }, []);
  const onUnpin = async () => {
    await chrome.tabs.update(bgTab, { pinned: false });
    setBgTab(null);
    setRegularVolume(40);
    setBgVolume(20);
    chrome.storage.session.remove("pinnedTab");
  };
  const onChangeRegularVolume = (e) => {
    setRegularVolume(e.target.value);
  };
  const onChangeBgVolume = (e) => {
    setBgVolume(e.target.value);
  };
  const onMouseUp = (e) => {
    chrome.storage.session.set({ [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div>
        Pinned: {tabTitle}
        <button onClick={onUnpin}>Unpin</button>
      </div>
      <div className="regular-volume">
        <label htmlFor="regular-volume-bar">Reg Vol: {regularVolume}</label>
        <input
          name="regularVolume"
          id="regular-volume-bar"
          type="range"
          value={regularVolume}
          onChange={onChangeRegularVolume}
          onMouseUp={onMouseUp}
          min={0}
          max={100}
        />
      </div>
      <div className="bg-Volume">
        <label htmlFor="bg-volume-bar">Baground Vol: {bgVolume} </label>
        <input
          name="bgVolume"
          id="bg-volume-bar"
          type="range"
          value={bgVolume}
          onChange={onChangeBgVolume}
          onMouseUp={onMouseUp}
          min={0}
          max={100}
        />
      </div>
    </div>
  );
}

export default PinnedTabPage;
