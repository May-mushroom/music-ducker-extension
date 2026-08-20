import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("side-panel-root")).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
);

function SidePanel() {
  return (
    <div>
      <h1>INSTRUCTION</h1>
      <p>
        You need to give the extension permission to capture audio of this tab.
        <b>Click the extension icon again</b> to give the extension permission
      </p>
    </div>
  );
}
