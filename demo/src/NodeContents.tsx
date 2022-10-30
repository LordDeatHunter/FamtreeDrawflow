import { Component, createSignal } from "solid-js";
import { DrawflowCallbacks } from "../../src/types";

interface NodeContentsProps {
  nodeId: () => string;
  drawflowCallbacks: () => DrawflowCallbacks | undefined;
}

const NodeContents: Component<NodeContentsProps> = (props) => {
  const [outputId, setOutputId] = createSignal<string>("");
  const [inputId, setInputId] = createSignal<string>("");

  return (
    <>
      <h3>{`Node ${props.nodeId()}`}</h3>
      <button
        style={{ top: "2rem", left: "2rem", "font-size": "1.5rem" }}
        onClick={(_) => {
          props.drawflowCallbacks()!.addNodeInput(props.nodeId());
        }}
      >
        Add input
      </button>
      <input
        value={inputId()}
        onInput={(e) => setInputId(e.currentTarget.value)}
      />
      <button
        style={{ top: "2rem", left: "2rem", "font-size": "1.5rem" }}
        onClick={(_) => {
          props
            .drawflowCallbacks()!
            .removeNodeInput(props.nodeId(), `input_${inputId()}`);
        }}
      >
        Remove input
      </button>
      <button
        style={{ top: "2rem", left: "2rem", "font-size": "1.5rem" }}
        onClick={(_) => {
          props.drawflowCallbacks()!.addNodeOutput(props.nodeId());
        }}
      >
        Add output
      </button>
      <input
        value={outputId()}
        onInput={(e) => setOutputId(e.currentTarget.value)}
      />
      <button
        style={{ top: "2rem", left: "2rem", "font-size": "1.5rem" }}
        onClick={(_) => {
          props
            .drawflowCallbacks()!
            .removeNodeOutput(props.nodeId(), `output_${outputId()}`);
        }}
      >
        Remove output
      </button>
    </>
  );
};
export default NodeContents;
