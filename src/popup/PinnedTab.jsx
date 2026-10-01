import { useState } from 'react';
import { MSG, send } from '../shared.js';

export default function PinnedTab({ tab, volumes }) {
  const [v, setV] = useState(volumes);

  const update = (key) => (e) => {
    const next = { ...v, [key]: Number(e.target.value) / 100 };
    setV(next);
    send({ type: MSG.SET_VOLUMES, volumes: next });
  };

  return (
    <>
      <div className="tab">
        {tab.favIconUrl && <img src={tab.favIconUrl} alt="" />}
        <span className="title" title={tab.title}>{tab.title}</span>
        <button onClick={() => send({ type: MSG.UNPIN })}>Unpin</button>
      </div>
      <label>
        Normal volume: {Math.round(v.normal * 100)}%
        <input type="range" min="0" max="100" value={Math.round(v.normal * 100)} onChange={update('normal')} />
      </label>
      <label>
        Background volume: {Math.round(v.background * 100)}%
        <input type="range" min="0" max="100" value={Math.round(v.background * 100)} onChange={update('background')} />
      </label>
    </>
  );
}
