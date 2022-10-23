// noinspection JSUnusedLocalSymbols

import { Component, createSignal, For, JSX, onMount, Show } from "solid-js";
import {
  CurvatureType,
  DrawflowCallbacks,
  DrawflowData,
  DrawflowInputConnection,
  DrawflowNodeType,
  DrawflowOutputConnection,
  EventListeners,
  StyleType,
} from "./types";
import DeleteBox from "./components/DeleteBox";
import "./drawflow.css";

interface DrawflowProps {
  drawflowCallbacks?: (callbacks: DrawflowCallbacks) => void;
}

const Drawflow: Component<DrawflowProps> = (props) => {
  const [node_elements, setNodeElements] = createSignal<Record<string, any>>(
    {}
  );
  const node_connections: JSX.Element[] = [];
  let events: EventListeners = {};
  let container: HTMLDivElement;
  let precanvas: HTMLDivElement;
  let deleteBox: JSX.Element | null = null;
  let ele_selected: HTMLElement | null = null;
  let node_selected: HTMLElement | null = null;
  let drag: boolean = false;
  let reroute: boolean = false;
  let reroute_fix_curvature: boolean = false;
  let curvature: number = 0.5;
  let reroute_curvature_start_end: number = 0.5;
  let reroute_curvature: number = 0.5;
  let rerouteWidth: number = 6;
  let drag_point: boolean = false;
  let editor_selected: boolean = false;
  let connection: boolean = false;
  let connection_ele: SVGSVGElement | null = null;
  let connection_selected: SVGPathElement | null = null;
  let canvas_x: number = 0;
  let canvas_y: number = 0;
  let pos_x: number = 0;
  let pos_x_start: number = 0;
  let pos_y: number = 0;
  let pos_y_start: number = 0;
  let mouse_x: number = 0;
  let mouse_y: number = 0;
  let line_path: number = 5;
  let first_click: Element | null = null;
  let force_first_input: boolean = false;
  let draggable_inputs: boolean = true;

  let drawflow: DrawflowData = { drawflow: { Home: { data: {} } } };

  let module = "Home";
  let editor_mode = "edit";
  let zoom = 1;
  let zoom_max = 1.6;
  let zoom_min = 0.5;
  let zoom_value = 0.1;
  let zoom_last_value = 1;

  let evCache: PointerEvent[] = [];
  let prevDiff = -1;

  let ref: HTMLDivElement | null = null;

  /* Mobile zoom */
  const pointerdown_handler = (e: PointerEvent) => {
    evCache.push(e);
  };

  const pointermove_handler = (e: PointerEvent) => {
    for (let i = 0; i < evCache.length; i++) {
      if (e.pointerId == evCache[i].pointerId) {
        evCache[i] = e;
        break;
      }
    }

    if (evCache.length == 2) {
      // Calculate the distance between the two pointers
      const curDiff = Math.abs(evCache[0].clientX - evCache[1].clientX);

      if (prevDiff > 100) {
        if (curDiff > prevDiff) {
          // The distance between the two pointers has increased
          zoom_in();
        }
        if (curDiff < prevDiff) {
          // The distance between the two pointers has decreased
          zoom_out();
        }
      }
      prevDiff = curDiff;
    }
  };

  const pointerup_handler = (e: PointerEvent) => {
    remove_event(e);
    if (evCache.length < 2) {
      prevDiff = -1;
    }
  };

  const remove_event = (e: PointerEvent) => {
    // Remove this event from the target's cache
    for (let i = 0; i < evCache.length; i++) {
      if (evCache[i].pointerId == e.pointerId) {
        evCache.splice(i, 1);
        break;
      }
    }
  };
  /* End Mobile Zoom */
  const load = (): void => {
    let key;
    for (key in drawflow.drawflow[module].data) {
      // addNodeImport(drawflow.drawflow[module].data[key], precanvas);
    }

    if (reroute) {
      for (key in drawflow.drawflow[module].data) {
        addRerouteImport(drawflow.drawflow[module].data[key]);
      }
    }

    for (key in drawflow.drawflow[module].data) {
      updateConnectionNodes(`node-${key}`);
    }

    // TODO: remove if no longer necessary
    // const editor = drawflow.drawflow;
    // let number = 1;
    // Object.keys(editor).map(function(moduleName, index) {
    //   Object.keys(editor[moduleName].data).map(function(id, index2) {
    //     if(parseInt(id) >= number) {
    //       number = parseInt(id)+1;
    //     }
    //   });
    // });
    // nodeId = number;
  };

  const removeRerouteConnectionSelected = () => {
    dispatch("connectionUnselected", true);
    if (reroute_fix_curvature) {
      connection_selected!
        .parentElement!.querySelectorAll(".main-path")
        .forEach((item) => {
          item.classList.remove("selected");
        });
    }
  };

  const onDrawflowNodeClick = (e: MouseEvent | TouchEvent) => {
    if (node_selected != null) {
      node_selected.classList.remove("selected");
      if (node_selected != ele_selected) {
        dispatch("nodeUnselected", true);
      }
    }
    if (connection_selected != null) {
      connection_selected.classList.remove("selected");
      removeRerouteConnectionSelected();
      connection_selected = null;
    }
    if (node_selected != ele_selected) {
      dispatch("nodeSelected", ele_selected?.id.slice(5));
    }
    node_selected = ele_selected as HTMLElement;
    node_selected!.classList.add("selected");
    const target = e.target as HTMLElement;
    if (!draggable_inputs) {
      if (
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA" &&
        target.tagName !== "SELECT" &&
        !target.hasAttribute("contenteditable")
      ) {
        drag = true;
      }
    } else if (target.tagName !== "SELECT") {
      drag = true;
    }
  };

  const unselectNode = (): void => {
    if (node_selected == null) {
      return;
    }
    node_selected.classList.remove("selected");
    node_selected = null;
    dispatch("nodeUnselected", true);
  };

  const onOutputClick = (e: MouseEvent | TouchEvent) => {
    connection = true;
    unselectNode();
    if (connection_selected != null) {
      connection_selected.classList.remove("selected");
      removeRerouteConnectionSelected();
      connection_selected = null;
    }
    drawConnection(e.target as HTMLElement);
  };

  const onDrawflowClick = (e: MouseEvent | TouchEvent) => {
    unselectNode();
    if (connection_selected != null) {
      connection_selected.classList.remove("selected");
      removeRerouteConnectionSelected();
      connection_selected = null;
    }
    editor_selected = true;
  };

  const onMainPathClick = (e: MouseEvent | TouchEvent) => {
    unselectNode();
    if (connection_selected != null) {
      connection_selected.classList.remove("selected");
      removeRerouteConnectionSelected();
      connection_selected = null;
    }
    connection_selected = ele_selected as unknown as SVGPathElement;
    connection_selected!.classList.add("selected");
    const classListConnection = connection_selected!.parentElement!.classList;
    if (classListConnection.length > 1) {
      dispatch("connectionSelected", {
        output_id: classListConnection[2].slice(14),
        input_id: classListConnection[1].slice(13),
        output_class: classListConnection[3],
        input_class: classListConnection[4],
      });
      if (reroute_fix_curvature) {
        connection_selected!
          .parentElement!.querySelectorAll(".main-path")
          .forEach((item) => {
            item.classList.add("selected");
          });
      }
    }
  };

  const onPointClick = (e: MouseEvent | TouchEvent) => {
    drag_point = true;
    ele_selected!.classList.add("selected");
  };

  const onDrawflowDeleteClick = (e: MouseEvent | TouchEvent) => {
    if (node_selected) {
      removeNodeId(node_selected.id);
    }

    if (connection_selected) {
      removeConnection();
    }

    if (node_selected != null) {
      node_selected.classList.remove("selected");
      node_selected = null;
      dispatch("nodeUnselected", true);
    }
    if (connection_selected != null) {
      connection_selected.classList.remove("selected");
      removeRerouteConnectionSelected();
      connection_selected = null;
    }
  };

  const click = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    dispatch("click", e);
    if (editor_mode === "fixed") {
      //return false;
      e.preventDefault();
      if (
        target.classList[0] === "parent-drawflow" ||
        target.classList[0] === "drawflow"
      ) {
        ele_selected = target.closest(".parent-drawflow");
      } else {
        return false;
      }
    } else if (editor_mode === "view") {
      if (
        target.closest(".drawflow") != null ||
        target.matches(".parent-drawflow")
      ) {
        ele_selected = target.closest(".parent-drawflow");
        e.preventDefault();
      }
    } else {
      first_click = target;
      ele_selected = target;
      // TODO: is this necessary?
      if ("button" in e && e.button === 0) {
        contextMenuDel();
      }

      if (target.closest(".drawflow_content_node") != null) {
        ele_selected = target.closest(".drawflow_content_node")!.parentElement;
      }
    }

    switch (ele_selected!.classList[0]) {
      case "drawflow-node": {
        onDrawflowNodeClick(e);
        break;
      }
      case "output": {
        onOutputClick(e);
        break;
      }
      case "input": {
        // nothing yet
        break;
      }
      case "parent-drawflow": {
        onDrawflowClick(e);
        break;
      }
      case "drawflow": {
        onDrawflowClick(e);
        break;
      }
      case "main-path": {
        onMainPathClick(e);
        break;
      }
      case "point": {
        onPointClick(e);
        break;
      }
      case "drawflow-delete": {
        onDrawflowDeleteClick(e);
        break;
      }
    }

    if (e.type === "touchstart") {
      const touch = e as TouchEvent;
      pos_x = touch.touches[0].clientX;
      pos_x_start = touch.touches[0].clientX;
      pos_y = touch.touches[0].clientY;
      pos_y_start = touch.touches[0].clientY;
      mouse_x = touch.touches[0].clientX;
      mouse_y = touch.touches[0].clientY;
    } else {
      const mouse = e as MouseEvent;
      pos_x = mouse.clientX;
      pos_x_start = mouse.clientX;
      pos_y = mouse.clientY;
      pos_y_start = mouse.clientY;
    }
    if (["input", "output", "main-path"].includes(ele_selected!.classList[0])) {
      e.preventDefault();
    }
    dispatch("clickEnd", e);
  };

  const position = (e: MouseEvent | TouchEvent) => {
    let y;
    let x;
    let e_pos_y;
    let e_pos_x;
    if (e.type === "touchmove") {
      const touch = e as TouchEvent;
      e_pos_x = touch.touches[0].clientX;
      e_pos_y = touch.touches[0].clientY;
    } else {
      const mouse = e as MouseEvent;
      e_pos_x = mouse.clientX;
      e_pos_y = mouse.clientY;
    }

    if (connection) {
      updateConnection(e_pos_x, e_pos_y);
    }
    if (editor_selected) {
      x = canvas_x + -(pos_x - e_pos_x);
      y = canvas_y + -(pos_y - e_pos_y);
      dispatch("translate", { x: x, y: y });
      precanvas.style.transform =
        "translate(" + x + "px, " + y + "px) scale(" + zoom + ")";
    }
    if (drag) {
      e.preventDefault();
      x =
        ((pos_x - e_pos_x) * precanvas.clientWidth) /
        (precanvas.clientWidth * zoom);
      y =
        ((pos_y - e_pos_y) * precanvas.clientHeight) /
        (precanvas.clientHeight * zoom);
      pos_x = e_pos_x;
      pos_y = e_pos_y;

      ele_selected!.style.top = ele_selected!.offsetTop - y + "px";
      ele_selected!.style.left = ele_selected!.offsetLeft - x + "px";

      drawflow.drawflow[module].data[ele_selected!.id.slice(5)].pos_x =
        ele_selected!.offsetLeft - x;
      drawflow.drawflow[module].data[ele_selected!.id.slice(5)].pos_y =
        ele_selected!.offsetTop - y;

      updateConnectionNodes(ele_selected!.id);
    }

    if (drag_point) {
      // What the hell is this even doing here??
      // x = (pos_x - e_pos_x) * precanvas.clientWidth / (precanvas.clientWidth * zoom);
      // y = (pos_y - e_pos_y) * precanvas.clientHeight / (precanvas.clientHeight * zoom);
      pos_x = e_pos_x;
      pos_y = e_pos_y;

      const dragged_pos_x =
        pos_x * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) -
        precanvas.getBoundingClientRect().x *
          (precanvas.clientWidth / (precanvas.clientWidth * zoom));
      const dragged_pos_y =
        pos_y * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) -
        precanvas.getBoundingClientRect().y *
          (precanvas.clientHeight / (precanvas.clientHeight * zoom));

      ele_selected!.setAttributeNS(null, "cx", String(dragged_pos_x));
      ele_selected!.setAttributeNS(null, "cy", String(dragged_pos_y));

      const parentElement = ele_selected!.parentElement!;

      const nodeUpdate = parentElement.classList[2].slice(9);
      const nodeUpdateIn = parentElement.classList[1].slice(13);
      const output_class = parentElement.classList[3];
      const input_class = parentElement.classList[4];

      let numberPointPosition =
        Array.from(parentElement.children).indexOf(ele_selected!) - 1;

      if (reroute_fix_curvature) {
        const numberMainPath =
          parentElement.querySelectorAll(".main-path").length - 1;
        numberPointPosition -= numberMainPath;
        if (numberPointPosition < 0) {
          numberPointPosition = 0;
        }
      }

      const nodeId = nodeUpdate.slice(5);
      const searchConnection = drawflow.drawflow[module].data[nodeId].outputs[
        output_class
      ].connections.findIndex(function (item, i) {
        return item.node === nodeUpdateIn && item.output === input_class;
      });

      drawflow.drawflow[module].data[nodeId].outputs[output_class].connections[
        searchConnection
      ].points![numberPointPosition] = {
        pos_x: dragged_pos_x,
        pos_y: dragged_pos_y,
      };

      const parentSelected = parentElement.classList[2].slice(9);

      updateConnectionNodes(parentSelected);
    }

    if (e.type === "touchmove") {
      mouse_x = e_pos_x;
      mouse_y = e_pos_y;
    }
    dispatch("mouseMove", { x: e_pos_x, y: e_pos_y });
  };

  const dragEnd = (e: MouseEvent | TouchEvent) => {
    let input_class;
    let input_id;
    let ele_last;
    let e_pos_y;
    let e_pos_x;
    if (e.type === "touchend") {
      e_pos_x = mouse_x;
      e_pos_y = mouse_y;
      ele_last = document.elementFromPoint(e_pos_x, e_pos_y)!;
    } else {
      const mouseEvent = e as MouseEvent;
      e_pos_x = mouseEvent.clientX;
      e_pos_y = mouseEvent.clientY;
      ele_last = mouseEvent.target! as HTMLElement;
    }

    if (drag) {
      if (pos_x_start != e_pos_x || pos_y_start != e_pos_y) {
        dispatch("nodeMoved", ele_selected!.id.slice(5));
      }
    }

    if (drag_point) {
      ele_selected!.classList.remove("selected");
      if (pos_x_start != e_pos_x || pos_y_start != e_pos_y) {
        dispatch(
          "rerouteMoved",
          ele_selected!.parentElement!.classList[2].slice(14)
        );
      }
    }

    if (editor_selected) {
      canvas_x = canvas_x + -(pos_x - e_pos_x);
      canvas_y = canvas_y + -(pos_y - e_pos_y);
      editor_selected = false;
    }
    if (connection) {
      if (
        ele_last.classList[0] === "input" ||
        (force_first_input &&
          (ele_last.closest(".drawflow_content_node") != null ||
            ele_last.classList[0] === "drawflow-node"))
      ) {
        if (
          force_first_input &&
          (ele_last.closest(".drawflow_content_node") != null ||
            ele_last.classList[0] === "drawflow-node")
        ) {
          input_id =
            ele_last.closest(".drawflow_content_node") != null
              ? ele_last.closest(".drawflow_content_node")!.parentElement!.id
              : ele_last.id;
          input_class =
            Object.keys(getNodeFromId(input_id.slice(5)).inputs).length === 0
              ? ""
              : "input_1";
        } else {
          // Fix connection;
          input_id = ele_last.parentElement!.parentElement!.id;
          input_class = ele_last.classList[1];
        }
        const output_id = ele_selected!.parentElement!.parentElement!.id;
        const output_class = ele_selected!.classList[1];

        if (output_id !== input_id && input_class !== "") {
          if (
            container.querySelectorAll(
              `.connection.node_in_${input_id}.node_out_${output_id}.${output_class}.${input_class}`
            ).length === 0
          ) {
            // Connection doesn't exist, save connection
            connection_ele!.classList.add("node_in_" + input_id);
            connection_ele!.classList.add("node_out_" + output_id);
            connection_ele!.classList.add(output_class);
            connection_ele!.classList.add(input_class);
            const id_input = input_id.slice(5);
            const id_output = output_id.slice(5);

            drawflow.drawflow[module].data[id_output].outputs[
              output_class
            ].connections.push({
              node: id_input,
              output: input_class,
            });
            drawflow.drawflow[module].data[id_input].inputs[
              input_class
            ].connections.push({
              node: id_output,
              input: output_class,
            });
            updateConnectionNodes(`node-${id_output}`);
            updateConnectionNodes(`node-${id_input}`);
            dispatch("connectionCreated", {
              output_id: id_output,
              input_id: id_input,
              output_class: output_class,
              input_class: input_class,
            });
          } else {
            dispatch("connectionCancel", true);
            connection_ele!.remove();
          }

          connection_ele = null;
        } else {
          // Connection exists Remove Connection;
          dispatch("connectionCancel", true);
          connection_ele!.remove();
          connection_ele = null;
        }
      } else {
        // Remove Connection;
        dispatch("connectionCancel", true);
        connection_ele!.remove();
        connection_ele = null;
      }
    }

    drag = false;
    drag_point = false;
    connection = false;
    ele_selected = null;
    editor_selected = false;

    dispatch("mouseUp", e);
  };

  const contextMenu = (e: MouseEvent): void => {
    dispatch("contextMenu", e);
    e.preventDefault();
    if (editor_mode === "fixed" || editor_mode === "view") {
      return;
    }

    contextMenuDel();

    if (connection_selected) {
      const style: StyleType = {};
      if (connection_selected.parentElement!.classList.length > 1) {
        style["top"] =
          e.clientY *
            (precanvas.clientHeight / (precanvas.clientHeight * zoom)) -
          precanvas.getBoundingClientRect().y *
            (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
          "px";
        style["left"] =
          e.clientX * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) -
          precanvas.getBoundingClientRect().x *
            (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
          "px";
      }
      deleteBox = <DeleteBox style={style} />;
    }
  };

  const contextMenuDel = (): void => {
    deleteBox = null;
  };

  const key = (e: KeyboardEvent): void => {
    dispatch("keydown", e);
    if (editor_mode === "fixed" || editor_mode === "view") {
      return;
    }
    if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
      if (
        node_selected != null &&
        first_click &&
        first_click.tagName !== "INPUT" &&
        first_click.tagName !== "TEXTAREA" &&
        !first_click.hasAttribute("contenteditable")
      ) {
        removeNodeId(node_selected.id);
      }
      if (connection_selected != null) {
        removeConnection();
      }
    }
  };

  const zoom_enter = (event: WheelEvent): void => {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY > 0) {
        // Zoom Out
        zoom_out();
      } else {
        // Zoom In
        zoom_in();
      }
    }
  };

  const zoom_refresh = (): void => {
    dispatch("zoom", zoom);
    canvas_x = (canvas_x / zoom_last_value) * zoom;
    canvas_y = (canvas_y / zoom_last_value) * zoom;
    zoom_last_value = zoom;
    precanvas.style.transform = `translate(${canvas_x}px, ${canvas_y}px) scale(${zoom})`;
  };

  const zoom_in = (): void => {
    if (zoom < zoom_max) {
      zoom += zoom_value;
      zoom_refresh();
    }
  };

  const zoom_out = (): void => {
    if (zoom > zoom_min) {
      zoom -= zoom_value;
      zoom_refresh();
    }
  };

  const zoom_reset = (): void => {
    if (zoom != 1) {
      zoom = 1;
      zoom_refresh();
    }
  };

  const createCurvature = (
    lineX: number,
    lineY: number,
    end_pos_x: number,
    end_pos_y: number,
    curvature: number,
    type: CurvatureType
  ): string => {
    let hx2;
    let hx1;
    switch (type) {
      case "open":
        if (lineX >= end_pos_x) {
          hx1 = lineX + Math.abs(end_pos_x - lineX) * curvature;
          hx2 = end_pos_x - Math.abs(end_pos_x - lineX) * (curvature * -1);
        } else {
          hx1 = lineX + Math.abs(end_pos_x - lineX) * curvature;
          hx2 = end_pos_x - Math.abs(end_pos_x - lineX) * curvature;
        }
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${end_pos_y} ${end_pos_x}  ${end_pos_y}`;
      case "close":
        if (lineX >= end_pos_x) {
          hx1 = lineX + Math.abs(end_pos_x - lineX) * (curvature * -1);
          hx2 = end_pos_x - Math.abs(end_pos_x - lineX) * curvature;
        } else {
          hx1 = lineX + Math.abs(end_pos_x - lineX) * curvature;
          hx2 = end_pos_x - Math.abs(end_pos_x - lineX) * curvature;
        }
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${end_pos_y} ${end_pos_x}  ${end_pos_y}`;
      case "other":
        if (lineX >= end_pos_x) {
          hx1 = lineX + Math.abs(end_pos_x - lineX) * (curvature * -1);
          hx2 = end_pos_x - Math.abs(end_pos_x - lineX) * (curvature * -1);
        } else {
          hx1 = lineX + Math.abs(end_pos_x - lineX) * curvature;
          hx2 = end_pos_x - Math.abs(end_pos_x - lineX) * curvature;
        }
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${end_pos_y} ${end_pos_x}  ${end_pos_y}`;
      default:
        hx1 = lineX + Math.abs(end_pos_x - lineX) * curvature;
        hx2 = end_pos_x - Math.abs(end_pos_x - lineX) * curvature;
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${end_pos_y} ${end_pos_x}  ${end_pos_y}`;
    }
  };

  const drawConnection = (ele: Element): void => {
    node_connections.push(
      <svg class="connection">
        <path class="main-path" d="" />
      </svg>
    );
    const id_output = ele.parentElement?.parentElement?.id.slice(5);
    const output_class = ele.classList[1];
    dispatch("connectionStart", {
      output_id: id_output,
      output_class: output_class,
    });
  };

  const updateConnection = (eX: number, eY: number): void => {
    let precanvasWidthZoom =
      precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWidthZoom = precanvasWidthZoom || 0;
    let precanvasHeightZoom =
      precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    let path = connection_ele!.children[0];

    const lineX =
      ele_selected!.offsetWidth / 2 +
      (ele_selected!.getBoundingClientRect().x -
        precanvas.getBoundingClientRect().x) *
        precanvasWidthZoom;
    const lineY =
      ele_selected!.offsetHeight / 2 +
      (ele_selected!.getBoundingClientRect().y -
        precanvas.getBoundingClientRect().y) *
        precanvasHeightZoom;

    const x =
      eX * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) -
      precanvas.getBoundingClientRect().x *
        (precanvas.clientWidth / (precanvas.clientWidth * zoom));
    const y =
      eY * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) -
      precanvas.getBoundingClientRect().y *
        (precanvas.clientHeight / (precanvas.clientHeight * zoom));

    const lineCurve = createCurvature(
      lineX,
      lineY,
      x,
      y,
      curvature,
      "openclose"
    );
    path.setAttributeNS(null, "d", lineCurve);
  };

  const addConnection = (
    id_output: string,
    id_input: string,
    output_class: string,
    input_class: string
  ): void => {
    const nodeOneModule = getModuleFromNodeId(id_output);
    const nodeTwoModule = getModuleFromNodeId(id_input);
    if (nodeOneModule === nodeTwoModule) {
      const dataNode = getNodeFromId(id_output);
      let exist = false;
      for (let checkOutput in dataNode.outputs[output_class].connections) {
        const connectionSearch =
          dataNode.outputs[output_class].connections[checkOutput];
        if (
          connectionSearch.node == id_input &&
          connectionSearch.output == input_class
        ) {
          exist = true;
        }
      }
      // Check connection exist
      if (!exist) {
        //Create Connection
        drawflow.drawflow[nodeOneModule].data[id_output].outputs[
          output_class
        ].connections.push({
          node: id_input.toString(),
          output: input_class,
        });
        drawflow.drawflow[nodeOneModule].data[id_input].inputs[
          input_class
        ].connections.push({
          node: id_output.toString(),
          input: output_class,
        });

        if (module === nodeOneModule) {
          //Draw connection
          const connection = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          path.classList.add("main-path");
          path.setAttributeNS(null, "d", "");
          // path.innerHTML = 'a';
          connection.classList.add("connection");
          connection.classList.add("node_in_node-" + id_input);
          connection.classList.add("node_out_node-" + id_output);
          connection.classList.add(output_class);
          connection.classList.add(input_class);
          connection.appendChild(path);
          precanvas.appendChild(connection);
          updateConnectionNodes("node-" + id_output);
          updateConnectionNodes("node-" + id_input);
        }

        dispatch("connectionCreated", {
          output_id: id_output,
          input_id: id_input,
          output_class: output_class,
          input_class: input_class,
        });
      }
    }
  };

  const updateConnectionNodes = (id: string): void => {
    const idSearch = "node_in_" + id;
    const idSearchOut = "node_out_" + id;
    let precanvasWidthZoom =
      precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWidthZoom = precanvasWidthZoom || 0;
    let precanvasHeightZoom =
      precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;

    const elemsOut = container.querySelectorAll(`.${idSearchOut}`);

    Object.keys(elemsOut).map((item, i) => {
      const elem = elemsOut[Number(item)];
      if (elem.querySelector(".point") === null) {
        const elementSearchId_out = container.querySelector(`#${id}`);

        const id_search = elem.classList[1].replace("node_in_", "");
        const elementSearchId = container.querySelector(`#${id_search}`);

        const elementSearch = elementSearchId!.querySelectorAll(
          "." + elem.classList[4]
        )[0] as HTMLElement;

        const eX =
          elementSearch.offsetWidth / 2 +
          (elementSearch.getBoundingClientRect().x -
            precanvas.getBoundingClientRect().x) *
            precanvasWidthZoom;
        const eY =
          elementSearch.offsetHeight / 2 +
          (elementSearch.getBoundingClientRect().y -
            precanvas.getBoundingClientRect().y) *
            precanvasHeightZoom;

        const elementSearchOut = elementSearchId_out!.querySelectorAll(
          "." + elem.classList[3]
        )[0] as HTMLElement;

        const lineX =
          elementSearchOut.offsetWidth / 2 +
          (elementSearchOut.getBoundingClientRect().x -
            precanvas.getBoundingClientRect().x) *
            precanvasWidthZoom;
        const lineY =
          elementSearchOut.offsetHeight / 2 +
          (elementSearchOut.getBoundingClientRect().y -
            precanvas.getBoundingClientRect().y) *
            precanvasHeightZoom;

        const lineCurve = createCurvature(
          lineX,
          lineY,
          eX,
          eY,
          curvature,
          "openclose"
        );
        elem.children[0].setAttributeNS(null, "d", lineCurve);
      } else {
        const points = elem.querySelectorAll(".point");
        let linecurve = "";
        const reroute_fix: string[] = [];
        points.forEach((point: Element, i: number) => {
          let elementSearchOut;
          let elementSearch;
          if (i === 0) {
            let elementSearchId_out = container.querySelector(`#${id}`);
            elementSearch = point;

            let eX =
              (elementSearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let eY =
              (elementSearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            elementSearchOut = elementSearchId_out!.querySelectorAll(
              "." + elementSearch.parentElement!.classList[3]
            )[0] as HTMLElement;
            let lineX =
              elementSearchOut.offsetWidth / 2 +
              (elementSearchOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom;
            let lineY =
              elementSearchOut.offsetHeight / 2 +
              (elementSearchOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature_start_end,
              "open"
            );
            linecurve += lineCurveSearch;
            reroute_fix.push(lineCurveSearch);
            if (points.length - 1 === 0) {
              elementSearchId_out = point;
              const id_search =
                elementSearchId_out.parentElement!.classList[1].replace(
                  "node_in_",
                  ""
                );
              const elementSearchId = container.querySelector(`#${id_search}`);

              const elementSearchIn = elementSearchId!.querySelectorAll(
                "." + elementSearchId_out.parentElement!.classList[4]
              )[0] as HTMLElement;
              eX =
                elementSearchIn.offsetWidth / 2 +
                (elementSearchIn.getBoundingClientRect().x -
                  precanvas.getBoundingClientRect().x) *
                  precanvasWidthZoom;
              eY =
                elementSearchIn.offsetHeight / 2 +
                (elementSearchIn.getBoundingClientRect().y -
                  precanvas.getBoundingClientRect().y) *
                  precanvasHeightZoom;

              lineX =
                (elementSearchId_out.getBoundingClientRect().x -
                  precanvas.getBoundingClientRect().x) *
                  precanvasWidthZoom +
                rerouteWidth;
              lineY =
                (elementSearchId_out.getBoundingClientRect().y -
                  precanvas.getBoundingClientRect().y) *
                  precanvasHeightZoom +
                rerouteWidth;
              lineCurveSearch = createCurvature(
                lineX,
                lineY,
                eX,
                eY,
                reroute_curvature_start_end,
                "close"
              );
              linecurve += lineCurveSearch;
              reroute_fix.push(lineCurveSearch);
            } else {
              elementSearchId_out = point;
              elementSearch = points[i + 1];

              eX =
                (elementSearch.getBoundingClientRect().x -
                  precanvas.getBoundingClientRect().x) *
                  precanvasWidthZoom +
                rerouteWidth;
              eY =
                (elementSearch.getBoundingClientRect().y -
                  precanvas.getBoundingClientRect().y) *
                  precanvasHeightZoom +
                rerouteWidth;
              lineX =
                (elementSearchId_out.getBoundingClientRect().x -
                  precanvas.getBoundingClientRect().x) *
                  precanvasWidthZoom +
                rerouteWidth;
              lineY =
                (elementSearchId_out.getBoundingClientRect().y -
                  precanvas.getBoundingClientRect().y) *
                  precanvasHeightZoom +
                rerouteWidth;

              lineCurveSearch = createCurvature(
                lineX,
                lineY,
                eX,
                eY,
                reroute_curvature,
                "other"
              );
              linecurve += lineCurveSearch;
              reroute_fix.push(lineCurveSearch);
            }
          } else if (i === points.length - 1) {
            const elementSearchId_out = point;

            const id_search =
              elementSearchId_out.parentElement!.classList[1].replace(
                "node_in_",
                ""
              );
            const elementSearchId = container.querySelector(`#${id_search}`);

            const elementSearchIn = elementSearchId!.querySelectorAll(
              "." + elementSearchId_out.parentElement!.classList[4]
            )[0] as HTMLElement;
            let eX =
              elementSearchIn.offsetWidth / 2 +
              (elementSearchIn.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom;
            let eY =
              elementSearchIn.offsetHeight / 2 +
              (elementSearchIn.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;
            let lineX =
              (elementSearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            let lineY =
              (elementSearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature_start_end,
              "close"
            );
            linecurve += lineCurveSearch;
            reroute_fix.push(lineCurveSearch);
          } else {
            const elementSearchId_out = point;
            elementSearch = points[i + 1];

            let eX =
              (elementSearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            let eY =
              (elementSearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;
            let lineX =
              (elementSearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            let lineY =
              (elementSearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature,
              "other"
            );
            linecurve += lineCurveSearch;
            reroute_fix.push(lineCurveSearch);
          }
        });
        if (reroute_fix_curvature) {
          reroute_fix.forEach((itempath, i) => {
            elem.children[i].setAttributeNS(null, "d", itempath);
          });
        } else {
          elem.children[0].setAttributeNS(null, "d", linecurve);
        }
      }
    });

    const elems = container.querySelectorAll(`.${idSearch}`);
    Object.keys(elems).map((item, index) => {
      const elem = elems[Number(item)] as HTMLElement;
      if (elem.querySelector(".point") === null) {
        let elementSearchId_in = container.querySelector(
          `#${id}`
        ) as HTMLElement;

        const id_search = elem.classList[2].replace("node_out_", "");
        const elementSearchId = container.querySelector(`#${id_search}`);
        const elementSearch = elementSearchId!.querySelectorAll(
          "." + elem.classList[3]
        )[0] as HTMLElement;

        const lineX =
          elementSearch.offsetWidth / 2 +
          (elementSearch.getBoundingClientRect().x -
            precanvas.getBoundingClientRect().x) *
            precanvasWidthZoom;
        const lineY =
          elementSearch.offsetHeight / 2 +
          (elementSearch.getBoundingClientRect().y -
            precanvas.getBoundingClientRect().y) *
            precanvasHeightZoom;

        elementSearchId_in = elementSearchId_in!.querySelectorAll(
          "." + elem.classList[4]
        )[0] as HTMLElement;
        const x =
          elementSearchId_in.offsetWidth / 2 +
          (elementSearchId_in.getBoundingClientRect().x -
            precanvas.getBoundingClientRect().x) *
            precanvasWidthZoom;
        const y =
          elementSearchId_in.offsetHeight / 2 +
          (elementSearchId_in.getBoundingClientRect().y -
            precanvas.getBoundingClientRect().y) *
            precanvasHeightZoom;

        const lineCurve = createCurvature(
          lineX,
          lineY,
          x,
          y,
          curvature,
          "openclose"
        );
        elem.children[0].setAttributeNS(null, "d", lineCurve);
      } else {
        const points = elem.querySelectorAll(".point");
        let lineCurve = "";
        const rerouteFix: string[] = [];
        points.forEach((point, i) => {
          if (i === 0 && points.length - 1 === 0) {
            let elementSearchId_out = container.querySelector(`#${id}`);
            let elementSearch = point;

            let lineX =
              (elementSearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let lineY =
              (elementSearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            let elementSearchIn = elementSearchId_out!.querySelectorAll(
              "." + elementSearch.parentElement!.classList[4]
            )[0] as HTMLElement;
            let eX =
              elementSearchIn.offsetWidth / 2 +
              (elementSearchIn.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom;
            let eY =
              elementSearchIn.offsetHeight / 2 +
              (elementSearchIn.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature_start_end,
              "close"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);

            elementSearchId_out = point;
            let id_search =
              elementSearchId_out.parentElement!.classList[2].replace(
                "node_out_",
                ""
              );
            let elementSearchId = container.querySelector(`#${id_search}`);

            let elementSearchOut = elementSearchId!.querySelectorAll(
              "." + elementSearchId_out.parentElement!.classList[3]
            )[0] as HTMLElement;
            lineX =
              elementSearchOut.offsetWidth / 2 +
              (elementSearchOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom;
            lineY =
              elementSearchOut.offsetHeight / 2 +
              (elementSearchOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            eX =
              (elementSearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            eY =
              (elementSearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature_start_end,
              "open"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          } else if (i === 0) {
            // FIRST
            let elementSearchId_out = point;
            let id_search =
              elementSearchId_out.parentElement!.classList[2].replace(
                "node_out_",
                ""
              );
            let elementSearchId = container.querySelector(`#${id_search}`);

            let elementSearchOut = elementSearchId!.querySelectorAll(
              "." + elementSearchId_out.parentElement!.classList[3]
            )[0] as HTMLElement;
            let lineX =
              elementSearchOut.offsetWidth / 2 +
              (elementSearchOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom;
            let lineY =
              elementSearchOut.offsetHeight / 2 +
              (elementSearchOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            let eX =
              (elementSearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let eY =
              (elementSearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature_start_end,
              "open"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);

            // SECOND
            elementSearchId_out = point;
            let elementSearch = points[i + 1];

            eX =
              (elementSearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            eY =
              (elementSearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            lineX =
              (elementSearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            lineY =
              (elementSearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature,
              "other"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          } else if (i === points.length - 1) {
            let elementSearchId_out = point;

            let id_search =
              elementSearchId_out.parentElement!.classList[1].replace(
                "node_in_",
                ""
              );
            let elementSearchId = container.querySelector(`#${id_search}`);

            let elementSearchIn = elementSearchId!.querySelectorAll(
              "." + elementSearchId_out.parentElement!.classList[4]
            )[0] as HTMLElement;
            let eX =
              elementSearchIn.offsetWidth / 2 +
              (elementSearchIn.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom;
            let eY =
              elementSearchIn.offsetHeight / 2 +
              (elementSearchIn.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            let lineX =
              (elementSearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let lineY =
              (elementSearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature_start_end,
              "close"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          } else {
            let elementSearchId_out = point;
            let elementSearch = points[i + 1];

            let eX =
              (elementSearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let eY =
              (elementSearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            let lineX =
              (elementSearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let lineY =
              (elementSearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              reroute_curvature,
              "other"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          }
        });
        if (reroute_fix_curvature) {
          rerouteFix.forEach((itemPath, i) => {
            elem.children[i].setAttributeNS(null, "d", itemPath);
          });
        } else {
          elem.children[0].setAttributeNS(null, "d", lineCurve);
        }
      }
    });
  };

  const dblclick = (e: MouseEvent | TouchEvent): void => {
    if (connection_selected != null && reroute) {
      createReroutePoint(connection_selected);
    }
    const target = e.target as Element;
    if (target.classList[0] === "point") {
      removeReroutePoint(target);
    }
  };

  const createReroutePoint = (ele: Element): void => {
    connection_selected!.classList.remove("selected");
    const parentElement = ele.parentElement!;
    const nodeUpdate =
      connection_selected!.parentElement!.classList[2].slice(9);
    const nodeUpdateIn =
      connection_selected!.parentElement!.classList[1].slice(13);
    const output_class = connection_selected!.parentElement!.classList[3];
    const input_class = connection_selected!.parentElement!.classList[4];
    connection_selected = null;
    const point = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    point.classList.add("point");
    const new_pos_x =
      pos_x * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) -
      precanvas.getBoundingClientRect().x *
        (precanvas.clientWidth / (precanvas.clientWidth * zoom));
    const new_pos_y =
      pos_y * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) -
      precanvas.getBoundingClientRect().y *
        (precanvas.clientHeight / (precanvas.clientHeight * zoom));

    point.setAttributeNS(null, "cx", String(new_pos_x));
    point.setAttributeNS(null, "cy", String(new_pos_y));
    point.setAttributeNS(null, "r", String(rerouteWidth));

    let position_add_array_point = 0;
    if (reroute_fix_curvature) {
      const numberPoints = parentElement.querySelectorAll(".main-path").length;
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.classList.add("main-path");
      path.setAttributeNS(null, "d", "");

      parentElement.insertBefore(path, parentElement.children[numberPoints]);
      if (numberPoints === 1) {
        parentElement.appendChild(point);
      } else {
        const search_point = Array.from(parentElement.children).indexOf(ele);
        position_add_array_point = search_point;
        parentElement.insertBefore(
          point,
          parentElement.children[search_point + numberPoints + 1]
        );
      }
    } else {
      parentElement.appendChild(point);
    }

    const nodeId = nodeUpdate.slice(5);
    const searchConnection = drawflow.drawflow[module].data[nodeId].outputs[
      output_class
    ].connections.findIndex(
      (item, i) => item.node === nodeUpdateIn && item.output === input_class
    );

    if (
      drawflow.drawflow[module].data[nodeId].outputs[output_class].connections[
        searchConnection
      ].points === undefined
    ) {
      drawflow.drawflow[module].data[nodeId].outputs[output_class].connections[
        searchConnection
      ].points = [];
    }

    if (reroute_fix_curvature) {
      if (
        position_add_array_point > 0 ||
        drawflow.drawflow[module].data[nodeId].outputs[output_class]
          .connections[searchConnection].points!.length !== 0
      ) {
        drawflow.drawflow[module].data[nodeId].outputs[
          output_class
        ].connections[searchConnection].points!.splice(
          position_add_array_point,
          0,
          {
            pos_x: new_pos_x,
            pos_y: new_pos_y,
          }
        );
      } else {
        drawflow.drawflow[module].data[nodeId].outputs[
          output_class
        ].connections[searchConnection].points!.push({
          pos_x: new_pos_x,
          pos_y: new_pos_y,
        });
      }

      parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });
    } else {
      drawflow.drawflow[module].data[nodeId].outputs[output_class].connections[
        searchConnection
      ].points!.push({
        pos_x: new_pos_x,
        pos_y: new_pos_y,
      });
    }

    dispatch("addReroute", nodeId);
    updateConnectionNodes(nodeUpdate);
  };

  const removeReroutePoint = (ele: Element): void => {
    const parentElement = ele.parentElement!;
    const nodeUpdate = parentElement.classList[2].slice(9);
    const nodeUpdateIn = parentElement.classList[1].slice(13);
    const output_class = parentElement.classList[3];
    const input_class = parentElement.classList[4];

    let numberPointPosition = Array.from(parentElement.children).indexOf(ele);
    const nodeId = nodeUpdate.slice(5);
    const searchConnection = drawflow.drawflow[module].data[nodeId].outputs[
      output_class
    ].connections.findIndex(
      (item: DrawflowOutputConnection) =>
        item.node === nodeUpdateIn && item.output === input_class
    );

    if (reroute_fix_curvature) {
      const numberMainPath =
        parentElement.querySelectorAll(".main-path").length;
      parentElement.children[numberMainPath - 1].remove();
      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    } else {
      numberPointPosition--;
    }
    drawflow.drawflow[module].data[nodeId].outputs[output_class].connections[
      searchConnection
    ].points!.splice(numberPointPosition, 1);

    ele.remove();
    dispatch("removeReroute", nodeId);
    updateConnectionNodes(nodeUpdate);
  };

  const getNodeFromId = (id: string): DrawflowNodeType => {
    const moduleName: string = getModuleFromNodeId(id);
    return JSON.parse(JSON.stringify(drawflow.drawflow[moduleName].data[id]));
  };

  const getNodesFromName = (name: string): string[] => {
    const nodes: string[] = [];
    const editor = drawflow.drawflow;
    Object.keys(editor).map((moduleName) => {
      for (let node in editor[moduleName].data) {
        if (editor[moduleName].data[node].name == name) {
          nodes.push(editor[moduleName].data[node].id);
        }
      }
    });
    return nodes;
  };

  const addNode = (
    name: string,
    inputs: number,
    outputs: number,
    positionX: number,
    positionY: number,
    classList: string,
    data: any,
    ContentNodeComponent: Component
  ): string => {
    const newNodeId = getUuid();
    // TODO: check what this is
    // Object.entries(data).forEach((key, value) => {
    //   if(typeof key[1] === "object") {
    //     insertObjectKeys(null, key[0], key[0]);
    //   } else {
    //     var elems = content.querySelectorAll('[df-'+key[0]+']');
    //     for(var i = 0; i < elems.length; i++) {
    //       elems[i].value = key[1];
    //       if(elems[i].isContentEditable) {
    //         elems[i].innerText = key[1];
    //       }
    //     }
    //   }
    // });

    // function insertObjectKeys(object, name, completname) {
    //   if(object === null) {
    //     var object = data[name];
    //   } else {
    //     var object = object[name]
    //   }
    //   if(object !== null) {
    //     Object.entries(object).forEach(function (key, value) {
    //       if(typeof key[1] === "object") {
    //         insertObjectKeys(object, key[0], completname+'-'+key[0]);
    //       } else {
    //         var elems = content.querySelectorAll('[df-'+completname+'-'+key[0]+']');
    //         for(var i = 0; i < elems.length; i++) {
    //           elems[i].value = key[1];
    //           if(elems[i].isContentEditable) {
    //             elems[i].innerText = key[1];
    //           }
    //         }
    //       }
    //     });
    //   }
    // }

    setNodeElements({
      ...node_elements(),
      [newNodeId]: {
        node: ContentNodeComponent,
        props: {
          inputs,
          outputs,
          positionX,
          positionY,
          classList,
          id: newNodeId,
        },
      },
    });

    // TODO: look into exporting
    // const json_inputs = {};
    // for (let x = 0; x < inputs; ++x) {
    //   json_inputs["input_" + (x + 1)] = { connections: [] };
    // }
    // const json_outputs = {};
    // for (let x = 0; x < outputs; x++) {
    //   json_outputs["output_" + (x + 1)] = { connections: [] };
    // }
    drawflow.drawflow[module].data[newNodeId] = {
      id: newNodeId,
      name: name,
      data: data,
      // inputs: json_inputs,
      // outputs: json_outputs,
      inputs: {},
      outputs: {},
      pos_x: positionX,
      pos_y: positionY,
    };

    dispatch("nodeCreated", newNodeId);
    return newNodeId;
  };

  // TODO: figure out exports/imports
  // const addNodeImport = (
  //   dataNode: DrawflowNodeType,
  //   precanvas: HTMLDivElement
  // ) => {
  //   const parent = document.createElement("div");
  //   parent.classList.add("parent-node");
  //
  //   const node = document.createElement("div");
  //   node.innerHTML = "";
  //   node.setAttribute("id", "node-" + dataNode.id);
  //   node.classList.add("drawflow-node");
  //   if (dataNode.class != "") {
  //     node.classList.add(...dataNode.class.split(" "));
  //   }
  //
  //   const inputs = document.createElement("div");
  //   inputs.classList.add("inputs");
  //
  //   const outputs = document.createElement("div");
  //   outputs.classList.add("outputs");
  //
  //   Object.keys(dataNode.inputs).forEach((input_item) => {
  //     const input = document.createElement("div");
  //     input.classList.add("input");
  //     input.classList.add(input_item);
  //     inputs.appendChild(input);
  //     dataNode.inputs[input_item].connections.forEach((output_item) => {
  //       const connection = document.createElementNS(
  //         "http://www.w3.org/2000/svg",
  //         "svg"
  //       );
  //       const path = document.createElementNS(
  //         "http://www.w3.org/2000/svg",
  //         "path"
  //       );
  //       path.classList.add("main-path");
  //       path.setAttributeNS(null, "d", "");
  //       // path.innerHTML = 'a';
  //       connection.classList.add("connection");
  //       connection.classList.add("node_in_node-" + dataNode.id);
  //       connection.classList.add("node_out_node-" + output_item.node);
  //       connection.classList.add(output_item.input);
  //       connection.classList.add(input_item);
  //
  //       connection.appendChild(path);
  //       precanvas.appendChild(connection);
  //     });
  //   });
  //
  //   for (let x = 0; x < Object.keys(dataNode.outputs).length; x++) {
  //     const output = document.createElement("div");
  //     output.classList.add("output");
  //     output.classList.add("output_" + (x + 1));
  //     outputs.appendChild(output);
  //   }
  //
  //   const content = document.createElement("div");
  //   content.classList.add("drawflow_content_node");
  //
  //   if (!dataNode.typenode) {
  //     content.innerHTML = dataNode.html;
  //   } else if (dataNode.typenode) {
  //     content.appendChild(noderegister[dataNode.html].html.cloneNode(true));
  //   } else {
  //     if (parseInt(render.version) === 3) {
  //       //Vue 3
  //       let wrapper = render.h(
  //         noderegister[dataNode.html].html,
  //         noderegister[dataNode.html].props,
  //         noderegister[dataNode.html].options
  //       );
  //       wrapper.appContext = parent;
  //       render.render(wrapper, content);
  //     } else {
  //       //Vue 2
  //       let wrapper = new render({
  //         parent: parent,
  //         render: (h) =>
  //           h(noderegister[dataNode.html].html, {
  //             props: noderegister[dataNode.html].props,
  //           }),
  //         ...noderegister[dataNode.html].options,
  //       }).$mount();
  //       content.appendChild(wrapper.$el);
  //     }
  //   }
  //
  //   Object.entries(dataNode.data).forEach(function (key, value) {
  //     if (typeof key[1] === "object") {
  //       insertObjectKeys(null, key[0], key[0]);
  //     } else {
  //       const elems = content.querySelectorAll("[df-" + key[0] + "]");
  //       for (let i = 0; i < elems.length; i++) {
  //         elems[i].value = key[1];
  //         if (elems[i].isContentEditable) {
  //           elems[i].innerText = key[1];
  //         }
  //       }
  //     }
  //   });
  //
  //   function insertObjectKeys(object, name, completname) {
  //     object = object === null ? dataNode.data[name] : object[name];
  //     if (object !== null) {
  //       Object.entries(object).forEach(function (key) {
  //         if (typeof key[1] === "object") {
  //           insertObjectKeys(object, key[0], completname + "-" + key[0]);
  //         } else {
  //           const elems = content.querySelectorAll(
  //             "[df-" + completname + "-" + key[0] + "]"
  //           );
  //           for (let i = 0; i < elems.length; i++) {
  //             elems[i].value = key[1];
  //             if (elems[i].isContentEditable) {
  //               elems[i].innerText = key[1];
  //             }
  //           }
  //         }
  //       });
  //     }
  //   }
  //
  //   node.appendChild(inputs);
  //   node.appendChild(content);
  //   node.appendChild(outputs);
  //   node.style.top = dataNode.pos_y + "px";
  //   node.style.left = dataNode.pos_x + "px";
  //   parent.appendChild(node);
  //   precanvas.appendChild(parent);
  // };

  const addRerouteImport = (dataNode: DrawflowNodeType) => {
    Object.keys(dataNode.outputs).map(function (output_item) {
      Object.keys(dataNode.outputs[output_item].connections).map(
        (input_item) => {
          const el =
            dataNode.outputs[output_item].connections[Number(input_item)];
          const points = el.points;
          if (points !== undefined) {
            points.forEach((point, i) => {
              const input_id = el.node;
              const input_class = el.output;
              const ele = container.querySelector(
                ".connection.node_in_node-" +
                  input_id +
                  ".node_out_node-" +
                  dataNode.id +
                  "." +
                  output_item +
                  "." +
                  input_class
              )!;

              if (reroute_fix_curvature) {
                if (i === 0) {
                  for (let z = 0; z < points.length; z++) {
                    const path = document.createElementNS(
                      "http://www.w3.org/2000/svg",
                      "path"
                    );
                    path.classList.add("main-path");
                    path.setAttributeNS(null, "d", "");
                    ele.appendChild(path);
                  }
                }
              }

              const pointElement = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
              );
              pointElement.classList.add("point");
              const item_pos_x = point.pos_x;
              const item_pos_y = point.pos_y;

              pointElement.setAttributeNS(null, "cx", String(item_pos_x));
              pointElement.setAttributeNS(null, "cy", String(item_pos_y));
              pointElement.setAttributeNS(null, "r", String(rerouteWidth));

              ele.appendChild(pointElement);
            });
          }
        }
      );
    });
  };

  const updateNodeValue = (event: InputEvent) => {
    const eventTarget = event.target as HTMLInputElement;
    const attr = eventTarget.attributes;
    for (let i = 0; i < attr.length; i++) {
      if (attr[i].nodeName.startsWith("df-")) {
        const keys = attr[i].nodeName.slice(3).split("-");
        let target =
          drawflow.drawflow[module].data[
            eventTarget
              .closest(".drawflow_content_node")!
              .parentElement!.id.slice(5)
          ].data;
        for (let index = 0; index < keys.length - 1; index += 1) {
          if (target[keys[index]] == null) {
            target[keys[index]] = {};
          }
          target = target[keys[index]];
        }
        target[keys[keys.length - 1]] = eventTarget.value;
        if (eventTarget.isContentEditable) {
          target[keys[keys.length - 1]] = eventTarget.innerText;
        }
        dispatch(
          "nodeDataChanged",
          eventTarget
            .closest(".drawflow_content_node")!
            .parentElement!.id.slice(5)
        );
      }
    }
  };

  // TODO: check if this is relevant
  // const updateNodeDataFromId = (id: string, data: any) => {
  //   const moduleName = getModuleFromNodeId(id);
  //   drawflow.drawflow[moduleName].data[id].data = data;
  //   if (module === moduleName) {
  //     const content = container.querySelector("#node-" + id)!;
  //
  //     Object.entries(data).forEach((key, value) => {
  //       if (typeof key[1] === "object") {
  //         insertObjectKeys(null, key[0], key[0]);
  //       } else {
  //         const elems = content.querySelectorAll("[df-" + key[0] + "]");
  //         for (let i = 0; i < elems.length; i++) {
  //           elems[i].value = key[1];
  //           if (elems[i].isContentEditable) {
  //             elems[i].innerText = key[1];
  //           }
  //         }
  //       }
  //     });
  //
  //     function insertObjectKeys(object, name: string, completeName: string) {
  //       object = object === null ? data[name] : object[name];
  //       if (object !== null) {
  //         Object.entries(object).forEach(function (key, value) {
  //           if (typeof key[1] === "object") {
  //             insertObjectKeys(object, key[0], `${completeName}-${key[0]}`);
  //           } else {
  //             const elems = content.querySelectorAll(
  //               `[df-${completeName}-${key[0]}]`
  //             );
  //             for (let i = 0; i < elems.length; i++) {
  //               elems[i].value = key[1];
  //               if (elems[i].isContentEditable) {
  //                 elems[i].innerText = key[1];
  //               }
  //             }
  //           }
  //         });
  //       }
  //     }
  //   }
  // };

  const addNodeInput = (id: string): void => {
    const moduleName = getModuleFromNodeId(id);
    const infoNode = getNodeFromId(id);
    const numInputs = Object.keys(infoNode.inputs).length;
    if (module === moduleName) {
      //Draw input
      const input = document.createElement("div");
      input.classList.add("input");
      input.classList.add("input_" + (numInputs + 1));
      const parent = container.querySelector(`#node-${id} .inputs`);
      parent!.appendChild(input);
      updateConnectionNodes("node-" + id);
    }
    drawflow.drawflow[moduleName].data[id].inputs[`input_${numInputs + 1}`] = {
      connections: [],
    };
  };

  const addNodeOutput = (id: string): void => {
    const moduleName = getModuleFromNodeId(id);
    const infoNode = getNodeFromId(id);
    const numOutputs = Object.keys(infoNode.outputs).length;
    if (module === moduleName) {
      //Draw output
      const output = document.createElement("div");
      output.classList.add("output");
      output.classList.add("output_" + (numOutputs + 1));
      const parent = container.querySelector(`#node-${id} .outputs`);
      parent!.appendChild(output);
      updateConnectionNodes("node-" + id);
    }
    drawflow.drawflow[moduleName].data[id].outputs[
      "output_" + (numOutputs + 1)
    ] = { connections: [] };
  };

  const removeNodeInput = (id: string, input_class: string): void => {
    const moduleName = getModuleFromNodeId(id);
    const infoNode = getNodeFromId(id);
    if (module === moduleName) {
      container
        .querySelector("#node-" + id + " .inputs .input." + input_class)!
        .remove();
    }
    const removeInputs: {
      id_output: string;
      id_input: string;
      output_class: string;
      input_class: string;
    }[] = [];
    Object.keys(infoNode.inputs[input_class].connections).map((key, index) => {
      const id_output = infoNode.inputs[input_class].connections[index].node;
      const output_class =
        infoNode.inputs[input_class].connections[index].input;
      removeInputs.push({ id_output, id_input: id, output_class, input_class });
    });
    // Remove connections
    removeInputs.forEach((item, i) => {
      removeSingleConnection(
        item.id_output,
        item.id_input,
        item.output_class,
        item.input_class
      );
    });

    delete drawflow.drawflow[moduleName].data[id].inputs[input_class];

    // Update connection
    const connections: { connections: DrawflowInputConnection[] }[] = [];
    const connectionsInputs = drawflow.drawflow[moduleName].data[id].inputs;
    Object.keys(connectionsInputs).map((key, index) => {
      connections.push(connectionsInputs[key]);
    });
    drawflow.drawflow[moduleName].data[id].inputs = {};
    const input_class_id = input_class.slice(6);
    let nodeUpdates: DrawflowInputConnection[] = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push(itemx);
      });
      drawflow.drawflow[moduleName].data[id].inputs["input_" + (i + 1)] = item;
    });
    let nodeUpdatesSet = new Set(nodeUpdates.map((e) => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdatesSet).map((e) => JSON.parse(e));

    // TODO: numeric ID stuff, check if required
    // if (module === moduleName) {
    //     const eles = container.querySelectorAll("#node-" + id + " .inputs .input");
    //     eles.forEach((item, i) => {
    //         const id_class = item.classList[1].slice(6);
    //         if (parseInt(input_class_id) < parseInt(id_class)) {
    //             item.classList.remove('input_' + id_class);
    //             item.classList.add('input_' + (id_class - 1));
    //         }
    //     });
    //
    // }
    //
    // nodeUpdates.forEach((itemx, i) => {
    //     drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections.forEach((itemz, g) => {
    //         if (itemz.node == id) {
    //             const output_id = itemz.output.slice(6);
    //             if (parseInt(input_class_id) < parseInt(output_id)) {
    //                 if (module === moduleName) {
    //                     const ele = container.querySelector(".connection.node_in_node-" + id + ".node_out_node-" + itemx.node + "." + itemx.input + ".input_" + output_id) as HTMLElement;
    //                     ele.classList.remove('input_' + output_id);
    //                     ele.classList.add('input_' + (output_id - 1));
    //                 }
    //                 if (itemz.points) {
    //                     drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections[g] = {
    //                         node: itemz.node,
    //                         output: 'input_' + (output_id - 1),
    //                         points: itemz.points
    //                     }
    //                 } else {
    //                     drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections[g] = {
    //                         node: itemz.node,
    //                         output: 'input_' + (output_id - 1)
    //                     }
    //                 }
    //             }
    //         }
    //     });
    // });
    updateConnectionNodes("node-" + id);
  };

  const removeNodeOutput = (id: string, output_class: string) => {
    const moduleName = getModuleFromNodeId(id);
    const infoNode = getNodeFromId(id);
    if (module === moduleName) {
      container
        .querySelector("#node-" + id + " .outputs .output." + output_class)!
        .remove();
    }
    const removeOutputs: {
      id_output: string;
      id_input: string;
      output_class: string;
      input_class: string;
    }[] = [];
    Object.keys(infoNode.outputs[output_class].connections).map(
      (key, index) => {
        const id_input = infoNode.outputs[output_class].connections[index].node;
        const input_class =
          infoNode.outputs[output_class].connections[index].output;
        removeOutputs.push({
          id_output: id,
          id_input,
          output_class,
          input_class,
        });
      }
    );
    // Remove connections
    removeOutputs.forEach((item) => {
      removeSingleConnection(
        item.id_output,
        item.id_input,
        item.output_class,
        item.input_class
      );
    });

    delete drawflow.drawflow[moduleName].data[id].outputs[output_class];

    // Update connection
    const connections: { connections: DrawflowOutputConnection[] }[] = [];
    const connectionOutputs = drawflow.drawflow[moduleName].data[id].outputs;
    Object.keys(connectionOutputs).forEach((key) => {
      connections.push(connectionOutputs[Number(key)]);
    });
    drawflow.drawflow[moduleName].data[id].outputs = {};
    const output_class_id = output_class.slice(7);
    let nodeUpdates: DrawflowOutputConnection[] = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push({ node: itemx.node, output: itemx.output });
      });
      drawflow.drawflow[moduleName].data[id].outputs["output_" + (i + 1)] =
        item;
    });
    let nodeUpdatesSet = new Set(nodeUpdates.map((e) => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdatesSet).map((e) => JSON.parse(e));

    // TODO: numeric ID stuff, check if required
    // if (module === moduleName) {
    //     const eles = container.querySelectorAll(`#node-${id} .outputs .output`);
    //     eles.forEach((item) => {
    //         const id_class = item.classList[1].slice(7);
    //         if (parseInt(output_class_id) < parseInt(id_class)) {
    //             item.classList.remove('output_' + id_class);
    //             item.classList.add('output_' + (id_class - 1));
    //         }
    //     });
    // }
    //
    // nodeUpdates.forEach((itemx, i) => {
    //     drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections.forEach((itemz, g) => {
    //         if (itemz.node == id) {
    //             const input_id = itemz.input.slice(7);
    //             if (parseInt(output_class_id) < parseInt(input_id)) {
    //                 if (module === moduleName) {
    //                     const ele = container.querySelector(`.connection.node_in_node-${itemx.node}.node_out_node-${id}.output_${input_id}.${itemx.output}`)!;
    //                     ele.classList.remove('output_' + input_id);
    //                     ele.classList.remove(itemx.output);
    //                     ele.classList.add('output_' + (input_id - 1));
    //                     ele.classList.add(itemx.output);
    //                 }
    //                 if (itemz.points) {
    //                     drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections[g] = {
    //                         node: itemz.node,
    //                         input: 'output_' + (input_id - 1),
    //                         points: itemz.points
    //                     }
    //                 } else {
    //                     drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections[g] = {
    //                         node: itemz.node,
    //                         input: 'output_' + (input_id - 1)
    //                     }
    //                 }
    //             }
    //         }
    //     });
    // });

    updateConnectionNodes("node-" + id);
  };

  const removeNodeId = (id: string): void => {
    removeConnectionNodeId(id);
    const moduleName = getModuleFromNodeId(id.slice(5));
    if (module === moduleName) {
      container.querySelector(`#${id}`)!.remove();
    }
    delete drawflow.drawflow[moduleName].data[id.slice(5)];
    dispatch("nodeRemoved", id.slice(5));
  };

  const removeConnection = () => {
    if (connection_selected != null) {
      const listClass = connection_selected.parentElement!.classList;
      connection_selected.parentElement!.remove();
      //console.log(listClass);
      const index_out = drawflow.drawflow[module].data[
        listClass[2].slice(14)
      ].outputs[listClass[3]].connections.findIndex(
        (item, i) =>
          item.node === listClass[1].slice(13) && item.output === listClass[4]
      );
      drawflow.drawflow[module].data[listClass[2].slice(14)].outputs[
        listClass[3]
      ].connections.splice(index_out, 1);

      const index_in = drawflow.drawflow[module].data[
        listClass[1].slice(13)
      ].inputs[listClass[4]].connections.findIndex(
        (item, i) =>
          item.node === listClass[2].slice(14) && item.input === listClass[3]
      );
      drawflow.drawflow[module].data[listClass[1].slice(13)].inputs[
        listClass[4]
      ].connections.splice(index_in, 1);

      dispatch("connectionRemoved", {
        output_id: listClass[2].slice(14),
        input_id: listClass[1].slice(13),
        output_class: listClass[3],
        input_class: listClass[4],
      });
      connection_selected = null;
    }
  };

  const removeSingleConnection = (
    id_output: string,
    id_input: string,
    output_class: string,
    input_class: string
  ): boolean => {
    const nodeOneModule = getModuleFromNodeId(id_output);
    const nodeTwoModule = getModuleFromNodeId(id_input);
    // Check nodes in same module.
    if (nodeOneModule !== nodeTwoModule) {
      return false;
    }
    // Check connection exist
    const exists = drawflow.drawflow[nodeOneModule].data[id_output].outputs[
      output_class
    ].connections.findIndex(
      (item, i) => item.node == id_input && item.output === input_class
    );
    if (exists <= -1) {
      return false;
    }
    // In same module with view.
    if (module === nodeOneModule) {
      container
        .querySelector(
          `.connection.node_in_node-${id_input}.node_out_node-${id_output}.${output_class}.${input_class}`
        )!
        .remove();
    }

    const index_out = drawflow.drawflow[nodeOneModule].data[id_output].outputs[
      output_class
    ].connections.findIndex(
      (item, i) => item.node == id_input && item.output === input_class
    );
    drawflow.drawflow[nodeOneModule].data[id_output].outputs[
      output_class
    ].connections.splice(index_out, 1);

    const index_in = drawflow.drawflow[nodeOneModule].data[id_input].inputs[
      input_class
    ].connections.findIndex(
      (item, i) => item.node == id_output && item.input === output_class
    );
    drawflow.drawflow[nodeOneModule].data[id_input].inputs[
      input_class
    ].connections.splice(index_in, 1);

    dispatch("connectionRemoved", {
      output_id: id_output,
      input_id: id_input,
      output_class: output_class,
      input_class: input_class,
    });
    return true;
  };

  const removeConnectionNodeId = (id: string): void => {
    const idSearchIn = "node_in_" + id;
    const idSearchOut = "node_out_" + id;

    const elemsOut = container.querySelectorAll(`.${idSearchOut}`);
    const elemsIn = container.querySelectorAll(`.${idSearchIn}`);
    removeConnectionNodes(elemsOut);
    removeConnectionNodes(elemsIn);
  };

  const removeConnectionNodes = (elements: NodeListOf<Element>): void => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const classList = elements[i].classList;

      const index_out = drawflow.drawflow[module].data[
        classList[2].slice(14)
      ].outputs[classList[3]].connections.findIndex(
        (item, i) =>
          item.node === classList[1].slice(13) && item.output === classList[4]
      );
      drawflow.drawflow[module].data[classList[2].slice(14)].outputs[
        classList[3]
      ].connections.splice(index_out, 1);

      const index_in = drawflow.drawflow[module].data[
        classList[1].slice(13)
      ].inputs[classList[4]].connections.findIndex(
        (item, i) =>
          item.node === classList[2].slice(14) && item.input === classList[3]
      );
      drawflow.drawflow[module].data[classList[1].slice(13)].inputs[
        classList[4]
      ].connections.splice(index_in, 1);

      elements[i].remove();

      dispatch("connectionRemoved", {
        output_id: classList[2].slice(14),
        input_id: classList[1].slice(13),
        output_class: classList[3],
        input_class: classList[4],
      });
    }
  };

  const getModuleFromNodeId = (id: string): string => {
    let nameModule = "";
    const editor = drawflow.drawflow;
    Object.keys(editor).forEach((moduleName, index) => {
      Object.keys(editor[moduleName].data).forEach((node, index2) => {
        if (node == id) {
          nameModule = moduleName;
          return;
        }
      });
    });
    return nameModule;
  };

  const addModule = (name: string): void => {
    drawflow.drawflow[name] = { data: {} };
    dispatch("moduleCreated", name);
  };

  const changeModule = (name: string): void => {
    dispatch("moduleChanged", name);
    module = name;
    precanvas.innerHTML = "";
    canvas_x = 0;
    canvas_y = 0;
    pos_x = 0;
    pos_y = 0;
    mouse_x = 0;
    mouse_y = 0;
    zoom = 1;
    zoom_last_value = 1;
    precanvas.style.transform = "";
    importDrawflow(drawflow, false);
  };

  const removeModule = (name: string): void => {
    if (module === name) {
      changeModule("Home");
    }
    delete drawflow.drawflow[name];
    dispatch("moduleRemoved", name);
  };

  const clearModuleSelected = (): void => {
    precanvas.innerHTML = "";
    drawflow.drawflow[module] = { data: {} };
  };

  const clear = (): void => {
    precanvas.innerHTML = "";
    drawflow = { drawflow: { Home: { data: {} } } };
  };

  const exportDrawflow = (): DrawflowData => {
    const dataExport = JSON.parse(JSON.stringify(drawflow));
    dispatch("export", dataExport);
    return dataExport;
  };

  const importDrawflow = (data: DrawflowData, notify = true): void => {
    clear();
    drawflow = JSON.parse(JSON.stringify(data));
    load();
    if (notify) {
      dispatch("import", "import");
    }
  };

  /* Events */
  const on = (event: string, callback: (event: Event) => void) => {
    // Check if the callback is not a function
    if (typeof callback !== "function") {
      console.error(
        `The listener callback must be a function, the given type is ${typeof callback}`
      );
      return false;
    }
    // Check if this event not exists
    if (events[event] === undefined) {
      events[event] = {
        listeners: [],
      };
    }
    events[event].listeners.push(callback);
  };

  const removeListener = (event: string, callback: (event: Event) => void) => {
    // Check if this event not exists

    if (!events[event]) return false;

    const listeners = events[event].listeners;
    const listenerIndex = listeners.indexOf(callback);
    const hasListener = listenerIndex > -1;
    if (hasListener) listeners.splice(listenerIndex, 1);
  };

  const dispatch = (event: string, details: any) => {
    // Check if this event not exists
    if (events[event] === undefined) {
      // console.error(`This event: ${event} does not exist`);
      return false;
    }
    events[event].listeners.forEach((listener) => {
      listener(details);
    });
  };

  const getUuid = (): string => {
    // http://www.ietf.org/rfc/rfc4122.txt
    const s: string[] = [];
    const hexDigits = "0123456789abcdef";
    for (let i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((Number(s[19]) & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    return s.join("");
  };

  onMount(() => {
    props.drawflowCallbacks?.({
      unselectNode,
      createCurvature,
      updateConnection,
      addConnection,
      updateConnectionNodes,
      getNodeFromId,
      getNodesFromName,
      addNode,
      addNodeInput,
      addNodeOutput,
      removeNodeInput,
      removeNodeOutput,
      removeNodeId,
      removeConnectionNodeId,
      removeConnectionNodes,
      getModuleFromNodeId,
      addModule,
      changeModule,
      removeModule,
      clearModuleSelected,
      clear,
      exportDrawflow,
      importDrawflow,
      getUuid,
    });
    load();
  });

  return (
    <div
      tabindex={0}
      class="parent-drawflow"
      id="drawflow"
      onMouseUp={dragEnd}
      onMouseMove={position}
      onMouseDown={click}
      onTouchEnd={dragEnd}
      onTouchMove={position}
      onTouchStart={click}
      onContextMenu={contextMenu}
      onKeyDown={key}
      onWheel={zoom_enter}
      onInput={updateNodeValue}
      onDblClick={dblclick}
      ref={container!}
    >
      <div
        class="drawflow"
        onPointerDown={pointerdown_handler}
        onPointerMove={pointermove_handler}
        onPointerUp={pointerup_handler}
        onPointerCancel={pointerup_handler}
        onPointerOut={pointerup_handler}
        onPointerLeave={pointerup_handler}
        ref={precanvas!}
      >
        <For each={Object.keys(node_elements())}>
          {(nodeId) => {
            const Node = node_elements()[nodeId].node;
            const props = node_elements()[nodeId].props;
            return (
              <div class="parent-node">
                <div
                  id={props.id}
                  class="drawflow-node"
                  style={{
                    left: `${props.positionX}px`,
                    top: `${props.positionY}px`,
                  }}
                >
                  <div class="drawflow_content_node">{<Node {...props} />}</div>
                </div>
              </div>
            );
          }}
        </For>
        <For each={node_connections}>{(connection) => connection}</For>
        <Show when={deleteBox}>{deleteBox}</Show>
      </div>
    </div>
  );
};

export default Drawflow;
