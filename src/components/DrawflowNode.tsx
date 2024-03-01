import { Component, For, Show } from "solid-js";
import DeleteBox from "./DeleteBox";
import { InputOutputProps } from "../types";

interface DrawflowNodeProps {
  inputs: Record<string, InputOutputProps>;
  outputs: Record<string, InputOutputProps>;
  positionX: number;
  positionY: number;
  classList: string;
  id: string;
  ContentNodeComponent: Component;
  hasDeleteBox: boolean;
  onDeleteBoxClick: () => void;
  setProps: (key: string, value: any) => void;
}

const DrawflowNode: Component<DrawflowNodeProps> = (props) => {
  const { ContentNodeComponent } = props;
  return (
    <div
      id={props.id}
      class={`drawflow-node {classList}`}
      style={{ top: `${props.positionY}px`, left: `${props.positionX}px` }}
      onContextMenu={(e) => {
        e.preventDefault();
        props.setProps("hasDeleteBox", true);
      }}
    >
      <div class="inputs">
        <For each={Object.keys(props.inputs)}>
          {(id) => <div ref={props.inputs[id].ref} class={`input ${id}`} />}
        </For>
      </div>
      <div class="drawflow_content_node">
        <ContentNodeComponent />
      </div>
      <div class="outputs">
        <For each={Object.keys(props.outputs)}>
          {(id) => <div ref={props.outputs[id].ref} class={`output ${id}`} />}
        </For>
      </div>
      <Show when={props.hasDeleteBox} keyed>
        <DeleteBox onClick={props.onDeleteBoxClick} />
      </Show>
    </div>
  );
};

export default DrawflowNode;
