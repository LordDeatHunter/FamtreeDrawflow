import { Component } from "solid-js";

export interface ConnectionEvent {
  output_id: string;
  input_id: string;
  output_class: string;
  input_class: string;
}

export interface ConnectionStartEvent {
  output_id: string;
  output_class: string;
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
    end_pos_x: number,
    end_pos_y: number,
    curvature: number,
    type: CurvatureType
  ) => string;
  updateConnection: (eX: number, eY: number) => void;
  addConnection: (
    id_output: string,
    id_input: string,
    output_class: string,
    input_class: string
  ) => void;
  updateConnectionNodes: (id: string) => void;
  getNodeFromId: (id: string) => DrawflowNodeType;
  getNodesFromName: (name: string) => string[];
  addNode: (
    name: string,
    inputs: number,
    outputs: number,
    positionX: number,
    positionY: number,
    classList: string,
    data: any,
    ContentNodeComponent: Component
  ) => string;
  addNodeInput: (id: string) => void;
  addNodeOutput: (id: string) => void;
  removeNodeInput: (id: string, input_class: string) => void;
  removeNodeOutput: (id: string, output_class: string) => void;
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
}

export interface DrawflowData {
  drawflow: {
    Home: DrawflowModuleData; // always present
    [customModuleName: string]: DrawflowModuleData;
  };
}

export interface DrawflowModuleData {
  data: {
    [nodeKey: string]: DrawflowNodeType;
  };
}

export interface NodeConnectionProps {
  connectionsString?: string;
  path?: string;
}

export type StyleType = Record<string, string | number | undefined>;

export interface DrawflowNodeType {
  data: any;
  id: string;
  inputs: DrawflowInputs;
  name: string;
  outputs: DrawflowOutputs;
  pos_x: number;
  pos_y: number;
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
  pos_x: number;
  pos_y: number;
}

export type EventListeners = Record<
  string,
  { listeners: ((event: Event) => void)[] }
>;

export type DrawFlowEditorMode = "edit" | "fixed" | "view";

export type CurvatureType = "open" | "close" | "openclose" | "other";
