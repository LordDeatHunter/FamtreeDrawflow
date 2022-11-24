import { Component } from "solid-js";

interface DeleteBoxProps {
  onClick?: () => void;
  style?: Record<string, string | number | undefined>;
}

const DeleteBox: Component<DeleteBoxProps> = (props) => {
  const { onClick = () => undefined, style = {} } = props;
  return (
    <div class="drawflow-delete" style={style} onClick={onClick}>
      🗙
    </div>
  );
};

export default DeleteBox;
