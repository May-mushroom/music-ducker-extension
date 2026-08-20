function LandingPage({ audibleTabs, onPin }) {
  const audibleTabList = audibleTabs.map((tab) => (
    <li className="audible-item" id={tab.id}>
      {tab.title}
      <button onClick={() => onPin(tab.id)}>Pin</button>
    </li>
  ));
  return (
    <>
      <h1>Audible Tabs</h1>
      <ul>{audibleTabList}</ul>
    </>
  );
}

export default LandingPage;
