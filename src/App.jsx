import { useEffect, useState } from "react";
import LandingPage from "./LandingPage";
import PinnedTabPage from "./PinnedTabPage";

function App() {
  const [audibleTabs, setAudibleTabs] = useState([]);
  const [bgTab, setBgTab] = useState(null);
  const [regularVolume, setRegularVolume] = useState(40);
  const [bgVolume, setBgVolume] = useState(20);
  const [prevTab, setPrevTab] = useState(null); // implement this feature later

  useEffect(() => {
    chrome.storage.session.get("pinnedTab").then(({ pinnedTab }) => {
      if (pinnedTab !== undefined) setBgTab(pinnedTab);
    });
  });
  useEffect(() => {
    chrome.tabs.query({ audible: true }).then((tabs) => {
      setAudibleTabs(tabs);
    });
  }, []);

  // useEffect(() => {
  //   console.log(bgTab);
  //   chrome.runtime.sendMessage(
  //     {
  //       type: "CHANGE_TAB_VOLUME",
  //       bgTabID: bgTab,
  //     },
  //     (res) => console.log(res),
  //   );
  //   return () => {
  //     console.log("FROM CLEANUP: run");
  //     chrome.runtime.sendMessage(
  //       {
  //         type: "RELEASE_STREAM",
  //       },
  //       (res) => console.log(res),
  //     );
  //   };
  // }, []);

  const onPin = async (tabID) => {
    chrome.tabs.update(tabID, {
      pinned: true,
      active: true,
    });
    setBgTab(tabID);
    chrome.storage.session.set({ pinnedTab: tabID });
    await chrome.sidePanel.open({ tabId: tabID });
  };

  return (
    <>
      {bgTab ? (
        <PinnedTabPage
          bgTab={bgTab}
          bgVolume={bgVolume}
          regularVolume={regularVolume}
          setBgTab={setBgTab}
          setBgVolume={setBgVolume}
          setRegularVolume={setRegularVolume}
        />
      ) : (
        <LandingPage audibleTabs={audibleTabs} onPin={onPin} />
      )}
    </>
  );
}

export default App;
