import {Component} from "solid-js";

interface DeleteBoxProps {
    onClick?: () => void;
    style?: Record<string, string | number | undefined>;
}

const DeleteBox: Component<DeleteBoxProps> = (props) => {
    const {onClick = () => undefined, style={}} = props;
    return (
        <div class="drawflow-delete" style={{
            position: 'absolute',
            display: 'block',
            width: '30px',
            height: '30px',
            background: 'black',
            color: 'white',
            'z-index': '4',
            border: '2px solid white',
            'line-height': '30px',
            'font-weight': 'bold',
            'text-align': 'center',
            'border-radius': '50%',
            'font-family': 'monospace',
            cursor: 'pointer',
            ...style
        }} onClick={onClick}>x</div>
    );
};

export default DeleteBox;
