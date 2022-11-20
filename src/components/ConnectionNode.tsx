import { Component, createSignal, For } from "solid-js";
import { PathProps, PointProps } from "../types";

export interface ConnectionNodeProps {
  onMainPathClick?: (id: string) => void;
  onMainPathDoubleClick?: (id: string) => void;
  pathSelected?: boolean;
  paths?: PathProps[];
  points?: PointProps[];
  inputId: string;
  outputId: string;
  inputClass: string;
  outputClass: string;
}

const ConnectionNode: Component<ConnectionNodeProps> = (props) => {
  const { onMainPathClick = () => {}, onMainPathDoubleClick = () => {} } =
    props;

  return (
    <svg
      class={`connection node_in_${props.inputId} node_out_${props.outputId} ${props.outputClass} ${props.inputClass}`}
    >
      <For each={props?.paths ?? []}>
        {(path) => (
          <path
            class="main-path"
            d={path.path}
            onClick={(e) => onMainPathClick(path.id)}
            onDblClick={() => onMainPathDoubleClick(path.id)}
            classList={{
              selected: !!props.pathSelected,
            }}
          />
        )}
      </For>
      <For each={props?.points ?? []}>
        {(point) => (
          <circle class="point" cx={point.cx} cy={point.cy} r={point.r} />
        )}
      </For>
    </svg>
  );
};

export default ConnectionNode;
