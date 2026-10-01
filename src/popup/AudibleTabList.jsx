import { useEffect, useState } from 'react';
import { YT_PATTERN } from '../shared.js';

export default function AudibleTabList({ onPin }) {
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setTabs(await chrome.tabs.query({ audible: true, url: YT_PATTERN }));
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      setActiveId(active?.id ?? null);
    };
    load();
    chrome.tabs.onUpdated.addListener(load);
    chrome.tabs.onRemoved.addListener(load);
    return () => {
      chrome.tabs.onUpdated.removeListener(load);
      chrome.tabs.onRemoved.removeListener(load);
    };
  }, []);

  if (!tabs.length) {
    return <p className="hint">No YouTube tab is playing audio. Start a video, then pin it as your background music.</p>;
  }
  return (
    <>
      <p className="hint">Choose the tab to use as background music.</p>
      <ul>
        {tabs.map((t) => (
          <li key={t.id}>
            {t.favIconUrl && <img src={t.favIconUrl} alt="" />}
            <span className="title" title={t.title}>{t.title}</span>
            <button onClick={() => onPin(t.id, t.id === activeId)}>Pin</button>
          </li>
        ))}
      </ul>
    </>
  );
}
