import { useEffect, useState } from "react";
import { MSG, send } from "../shared.js";
import AudibleTabList from "./AudibleTabList.jsx";
import PinnedTab from "./PinnedTab.jsx";

export default function App() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () =>
      setState(
        await chrome.storage.session.get([
          "backgroundTab",
          "volumes",
          "pendingPin",
        ]),
      );
    load();
    chrome.storage.session.onChanged.addListener(load);
    return () => chrome.storage.session.onChanged.removeListener(load);
  }, []);

  const pin = async (tabId) => {
    const res = await send({ type: MSG.PIN, tabId });
    if (!res?.ok) setError(res?.error || "Could not pin this tab.");
  };

  // Finish a pending pin when the popup is opened on the target tab (grants activeTab).
  useEffect(() => {
    if (!state?.pendingPin || state.backgroundTab) return;
    chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
      if (t?.id === state.pendingPin) pin(t.id);
    });
  }, [state?.pendingPin]);

  const onPin = async (tabId, isActiveTab) => {
    setError("");
    if (isActiveTab) return pin(tabId);
    const res = await send({ type: MSG.PREPARE_PIN, tabId });
    if (res?.ok) {
      window.close();
      console.log(res);
    } else {
      setError(res?.error || "Could not switch to that tab.");
    }
  };

  if (!state) return null;
  return (
    <>
      <h1>Music Ducker</h1>
      {error && <p className="error">{error}</p>}
      {state.backgroundTab ? (
        <PinnedTab tab={state.backgroundTab} volumes={state.volumes} />
      ) : (
        <AudibleTabList onPin={onPin} />
      )}
    </>
  );
}
