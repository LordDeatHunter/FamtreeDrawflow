import { Component, For } from "solid-js";
import { PathProps, PointProps } from "../types";

export interface ConnectionNodeProps {
  onMainPathClick?: (id: string) => void;
  onMainPathDoubleClick?: (id: string) => void;
  onPointDoubleClick?: (id: string) => void;
  onPointClick?: (id: string) => void;
  pathSelected?: boolean;
  paths?: PathProps[];
  points?: PointProps[];
  inputId: string;
  outputId: string;
  inputClass: string;
  outputClass: string;
  // TODO: propagate id through methods
  id: string;
}

const ConnectionNode: Component<ConnectionNodeProps> = (props) => {
  const {
    onMainPathClick = () => {},
    onMainPathDoubleClick = () => {},
    onPointDoubleClick = () => {},
    onPointClick = () => {},
  } = props;

  return (
    <svg
      class={`connection node_in_${props.inputId} node_out_${props.outputId} ${props.outputClass} ${props.inputClass}`}
    >
      <For each={props?.paths ?? []}>
        {(path) => (
          <path
            class="main-path"
            d={path.path}
            onMouseDown={(e) => {
              onMainPathClick(path.id);
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              onMainPathClick(path.id);
              e.preventDefault();
            }}
            onDblClick={() => onMainPathDoubleClick(path.id)}
            classList={{
              selected: !!props.pathSelected,
            }}
          />
        )}
      </For>
      <For each={props?.points ?? []}>
        {(point) => (
          <circle
            onMouseDown={(e) => {
              if (e.detail === 2 && e.button === 0) {
                onPointDoubleClick(point.id);
              } else {
                onPointClick(point.id);
              }
            }}
            onTouchStart={(e) => {
              if (e.detail === 2) {
                onPointDoubleClick(point.id);
              } else {
                onPointClick(point.id);
              }
            }}
            class="point"
            cx={point.cx}
            cy={point.cy}
            r={point.r}
            classList={{
              selected: !!point.selected,
            }}
          />
        )}
      </For>
    </svg>
  );
};

export default ConnectionNode;
