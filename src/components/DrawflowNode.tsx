import { Component, createSignal, For, Show } from "solid-js";
import DeleteBox from "./DeleteBox";

interface DrawflowNodeProps {
  inputs: number;
  outputs: number;
  positionX: number;
  positionY: number;
  classList: string;
  id: string;
  ContentNodeComponent: Component;
  onDeleteBoxClick: () => void;
}

// TODO: use this in Drawflow.tsx
const DrawflowNode: Component<DrawflowNodeProps> = (props) => {
  const {
    inputs,
    outputs,
    positionX,
    positionY,
    classList,
    id,
    ContentNodeComponent,
  } = props;
  const [hasDeleteBox, setHasDeleteBox] = createSignal(false);

  return (
    <div
      class={`drawflow-node ${classList}`}
      id={`node-${id}`}
      style={{ top: `${positionY}px`, left: `${positionX}px` }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <div class="inputs">
        <For each={[...Array(inputs).keys()]}>
          {(i) => <div class={`input input_${i + 1}`} />}
        </For>
      </div>
      <div class="drawflow_content_node">
        <ContentNodeComponent />
      </div>
      <div class="outputs">
        <For each={[...Array(outputs).keys()]}>
          {(i) => <div class={`output output_${i + 1}`} />}
        </For>
      </div>
      <Show when={hasDeleteBox()} keyed>
        <DeleteBox onClick={props.onDeleteBoxClick} />
      </Show>
    </div>
  );
};

export default DrawflowNode;
