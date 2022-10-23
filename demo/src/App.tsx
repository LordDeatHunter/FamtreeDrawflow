import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import Drawflow from "famtreedrawflow";
import { DrawflowCallbacks } from "../../src/types";

const App: Component = () => {
  const [drawflowCallbacks, setDrawflowCallbacks] =
    createSignal<DrawflowCallbacks>();

  const getRandomNumber = () => {
    return Math.floor(Math.random() * 10);
  };

  return (
    <>
      <button
        style={{ top: "2rem", left: "2rem", "font-size": "1.5rem" }}
        onClick={(_) => {
          const [id, setId] = createSignal("");
          setId(
            drawflowCallbacks()!.addNode(
              `Home`,
              3,
              3,
              getRandomNumber() * 10,
              getRandomNumber() * 10,
              "",
              "",
              () => <h3>{`Node ${id()}`}</h3>
            )
          );
        }}
      >
        Create new node
      </button>
      <Drawflow drawflowCallbacks={setDrawflowCallbacks} />
    </>
  );
};

export default App;
