import { Component } from "solid-js";

export interface ConnectionEvent {
  outputId: string;
  inputId: string;
  outputClass: string;
  inputClass: string;
}

export interface ConnectionStartEvent {
  outputId: string;
  outputClass: string;
}

export interface MousePositionEvent {
  x: number;
  y: number;
}

export interface DrawflowCallbacks {
  unselectNode: () => void;
  createCurvature: (
    lineX: number,
    lineY: number,
    endPositionX: number,
    endPositionY: number,
    curvature: number,
    type: CurvatureType
  ) => string;
  updateConnection: (eX: number, eY: number) => void;
  addConnection: (
    outputId: string,
    inputId: string,
    outputClass: string,
    inputClass: string
  ) => void;
  updateConnectionNodes: (id: string) => void;
  getNodeFromId: (id: string) => DrawflowNodeType;
  getNodesFromName: (name: string) => string[];
  addNode: (
    name: string,
    inputs: number,
    outputs: number,
    nodePositionX: number,
    nodePositionY: number,
    classList: string,
    data: any,
    ContentNodeComponent: Component
  ) => string;
  addNodeInput: (id: string) => void;
  addNodeOutput: (id: string) => void;
  removeNodeInput: (id: string, inputClass: string) => void;
  removeNodeOutput: (id: string, outputClass: string) => void;
  removeNodeId: (id: string) => void;
  removeConnectionNodeId: (id: string) => void;
  removeConnectionNodes: (elements: NodeListOf<Element>) => void;
  getModuleFromNodeId: (id: string) => string;
  addModule: (name: string) => void;
  changeModule: (name: string) => void;
  removeModule: (name: string) => void;
  clearModuleSelected: () => void;
  clear: () => void;
  exportDrawflow: () => DrawflowData;
  importDrawflow: (data: DrawflowData, notify?: boolean) => void;
  getUuid: () => string;
  nodeElements: () => Record<string, any>;
}

export interface DrawflowData {
  Home: DrawflowModuleData; // always present
  [customModuleName: string]: DrawflowModuleData;
}

export interface DrawflowModuleData {
  data: {
    [nodeKey: string]: DrawflowNodeType;
  };
}

export interface NodeConnection {
  props: NodeConnectionProps;
  setProps: (key: string, value: any) => void;
}

export interface NodeElementProps {
  inputs: Record<string, InputOutputProps>;
  outputs: Record<string, InputOutputProps>;
  positionX: number;
  positionY: number;
  classList: string;
  id: string;
  hasDeleteBox: boolean;
  onDeleteBoxClick: () => void;
}

export interface InputOutputProps {
  ref?: HTMLDivElement;
}

export interface NodeConnectionProps {
  points: PointProps[];
  paths: PathProps[];
  pathSelected?: boolean;
  inputId: string;
  outputId: string;
  inputClass: string;
  outputClass: string;
  id: string;
}

export interface PathProps {
  path: string;
  id: string;
}

export interface PointProps {
  id: string;
  selected?: boolean;
  cx: number;
  cy: number;
  r: number;
  ref: SVGCircleElement;
}

export type StyleType = Record<string, string | number | undefined>;

export interface DrawflowNodeType {
  data: any;
  id: string;
  inputs: DrawflowInputs;
  name: string;
  outputs: DrawflowOutputs;
  positionX: number;
  positionY: number;
}

export type DrawflowOutputs = Record<
  string,
  { connections: DrawflowOutputConnection[] }
>;
export type DrawflowInputs = Record<
  string,
  { connections: DrawflowInputConnection[] }
>;

export interface DrawflowInputConnection {
  input: string;
  node: string;
  points?: Point[];
}

export interface DrawflowOutputConnection {
  output: string;
  node: string;
  points?: Point[];
}

export interface Point {
  positionX: number;
  positionY: number;
}

export type EventListeners = Record<
  string,
  { listeners: ((event: Event) => void)[] }
>;

export type DrawFlowEditorMode = "edit" | "fixed" | "view";

export type CurvatureType = "open" | "close" | "openclose" | "other";
