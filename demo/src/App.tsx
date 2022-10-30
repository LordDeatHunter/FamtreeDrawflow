import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import Drawflow from "famtreedrawflow";
import { DrawflowCallbacks } from "../../src/types";
import NodeContents from "./NodeContents";

const App: Component = () => {
  const [drawflowCallbacks, setDrawflowCallbacks] =
    createSignal<DrawflowCallbacks>();

  const getRandomNumber = () => Math.floor(Math.random() * 10);

  return (
    <>
      <button
        style={{ top: "2rem", left: "2rem", "font-size": "1.5rem" }}
        onClick={(_) => {
          const [nodeId, setNodeId] = createSignal("");
          setNodeId(
            drawflowCallbacks()!.addNode(
              `Home`,
              3,
              3,
              getRandomNumber() * 10,
              getRandomNumber() * 10,
              "",
              "",
              () => (
                <NodeContents
                  nodeId={nodeId}
                  drawflowCallbacks={drawflowCallbacks}
                />
              )
            )
          );
        }}
      >
        Create new node
      </button>
      <button
        style={{ top: "2rem", left: "2rem", "font-size": "1.5rem" }}
        onClick={(_) => {
          drawflowCallbacks()!.clearModuleSelected();
        }}
      >
        Wipe module
      </button>
      <Drawflow drawflowCallbacks={setDrawflowCallbacks} />
    </>
  );
};

export default App;
