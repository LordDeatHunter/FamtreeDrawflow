// noinspection JSUnusedLocalSymbols

import { Component, createSignal, For, onMount, Show } from "solid-js";
import {
  CurvatureType,
  DrawflowCallbacks,
  DrawflowData,
  DrawflowInputs,
  DrawflowNodeType,
  DrawflowOutputConnection,
  DrawflowOutputs,
  EventListeners,
  NodeConnectionProps,
  StyleType,
} from "./types";
import DeleteBox from "./components/DeleteBox";
import "./drawflow.css";

interface DrawflowProps {
  drawflowCallbacks?: (callbacks: DrawflowCallbacks) => void;
}

const Drawflow: Component<DrawflowProps> = (props) => {
  const [nodeElements, setNodeElements] = createSignal<Record<string, any>>({});
  const [nodeConnections, setNodeConnections] = createSignal<
    {
      setProps: (props: NodeConnectionProps) => void;
      props: () => NodeConnectionProps;
    }[]
  >([]);
  const [precanvasTransform, setPrecanvasTransform] = createSignal<string>("");
  const getConnectionElement = () => nodeConnections().slice(-1)[0];
  let events: EventListeners = {};
  let container: HTMLDivElement;
  let precanvas: HTMLDivElement;
  let [deleteBoxProps, setDeleteBoxProps] = createSignal<{ style?: any }>({});
  let selectedElement: HTMLElement | null = null;
  let selectedNode: HTMLElement | null = null;
  let drag: boolean = false;
  let reroute: boolean = false;
  let shouldRerouteFixCurvature: boolean = false;
  let curvature: number = 0.5;
  let rerouteCurvatureStartEnd: number = 0.5;
  let rerouteCurvature: number = 0.5;
  let rerouteWidth: number = 6;
  let dragPoint: boolean = false;
  let isEditorSelected: boolean = false;
  let connection: boolean = false;
  let selectedConnection: SVGPathElement | null = null;
  let canvasX: number = 0;
  let canvasY: number = 0;
  let positionX: number = 0;
  let positionY: number = 0;
  let startPositionX: number = 0;
  let startPositionY: number = 0;
  let mouseX: number = 0;
  let mouseY: number = 0;
  let firstClick: Element | null = null;
  let shouldForceFirstInput: boolean = false;
  let areInputsDraggable: boolean = true;

  let drawflow: DrawflowData = { Home: { data: {} } };

  let module = "Home";
  let editorMode = "edit";
  let zoom = 1;
  let maxZoom = 1.6;
  let minZoom = 0.5;
  let zoomAmount = 0.1;
  let lastZoom = 1;

  let evCache: PointerEvent[] = [];
  let prevDiff = -1;

  let ref: HTMLDivElement | null = null;

  /* Mobile zoom */
  const handlePointerDown = (e: PointerEvent) => {
    evCache.push(e);
  };

  const handlePointerMoved = (e: PointerEvent) => {
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
          zoomIn();
        }
        if (curDiff < prevDiff) {
          // The distance between the two pointers has decreased
          zoomOut();
        }
      }
      prevDiff = curDiff;
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    removeEvent(e);
    if (evCache.length < 2) {
      prevDiff = -1;
    }
  };

  const removeEvent = (e: PointerEvent) => {
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
    for (key in drawflow[module].data) {
      // addNodeImport(drawflow[module].data[key], precanvas);
    }

    if (reroute) {
      for (key in drawflow[module].data) {
        addRerouteImport(drawflow[module].data[key]);
      }
    }

    for (key in drawflow[module].data) {
      updateConnectionNodes(key);
    }
  };

  const removeRerouteConnectionSelected = () => {
    dispatch("connectionUnselected", true);
    if (shouldRerouteFixCurvature) {
      selectedConnection!
        .parentElement!.querySelectorAll(".main-path")
        .forEach((item) => {
          item.classList.remove("selected");
        });
    }
  };

  const onDrawflowNodeClick = (e: MouseEvent | TouchEvent) => {
    if (selectedNode != null) {
      selectedNode.classList.remove("selected");
      if (selectedNode != selectedElement) {
        dispatch("nodeUnselected", true);
      }
    }
    if (selectedConnection != null) {
      selectedConnection.classList.remove("selected");
      removeRerouteConnectionSelected();
      selectedConnection = null;
    }
    if (selectedNode != selectedElement) {
      dispatch("nodeSelected", selectedElement?.id);
    }
    selectedNode = selectedElement as HTMLElement;
    selectedNode!.classList.add("selected");
    const target = e.target as HTMLElement;
    if (!areInputsDraggable) {
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
    if (selectedNode == null) {
      return;
    }
    selectedNode.classList.remove("selected");
    selectedNode = null;
    dispatch("nodeUnselected", true);
  };

  const onOutputClick = (e: MouseEvent | TouchEvent) => {
    connection = true;
    unselectNode();
    if (selectedConnection != null) {
      selectedConnection.classList.remove("selected");
      removeRerouteConnectionSelected();
      selectedConnection = null;
    }
    drawConnection(e.target as HTMLElement);
  };

  const onDrawflowClick = (e: MouseEvent | TouchEvent) => {
    unselectNode();
    if (selectedConnection != null) {
      selectedConnection.classList.remove("selected");
      removeRerouteConnectionSelected();
      selectedConnection = null;
    }
    isEditorSelected = true;
  };

  const onMainPathClick = (e: MouseEvent | TouchEvent) => {
    unselectNode();
    if (selectedConnection != null) {
      selectedConnection.classList.remove("selected");
      removeRerouteConnectionSelected();
      selectedConnection = null;
    }
    selectedConnection = selectedElement as unknown as SVGPathElement;
    selectedConnection!.classList.add("selected");
    const classListConnection = selectedConnection!.parentElement!.classList;
    if (classListConnection.length > 1) {
      dispatch("connectionSelected", {
        outputId: classListConnection[2].slice(9),
        inputId: classListConnection[1].slice(8),
        outputClass: classListConnection[3],
        inputClass: classListConnection[4],
      });
      if (shouldRerouteFixCurvature) {
        selectedConnection!
          .parentElement!.querySelectorAll(".main-path")
          .forEach((item) => {
            item.classList.add("selected");
          });
      }
    }
  };

  const onPointClick = (e: MouseEvent | TouchEvent) => {
    dragPoint = true;
    selectedElement!.classList.add("selected");
  };

  const onDrawflowDeleteClick = (e: MouseEvent | TouchEvent) => {
    if (selectedNode) {
      removeNodeId(selectedNode.id);
    }

    if (selectedConnection) {
      removeConnection();
    }

    if (selectedNode != null) {
      selectedNode.classList.remove("selected");
      selectedNode = null;
      dispatch("nodeUnselected", true);
    }
    if (selectedConnection != null) {
      selectedConnection.classList.remove("selected");
      removeRerouteConnectionSelected();
      selectedConnection = null;
    }
  };

  const click = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    dispatch("click", e);
    if (editorMode === "fixed") {
      //return false;
      e.preventDefault();
      if (
        target.classList[0] === "parent-drawflow" ||
        target.classList[0] === "drawflow"
      ) {
        selectedElement = target.closest(".parent-drawflow");
      } else {
        return false;
      }
    } else if (editorMode === "view") {
      if (
        target.closest(".drawflow") != null ||
        target.matches(".parent-drawflow")
      ) {
        selectedElement = target.closest(".parent-drawflow");
        e.preventDefault();
      }
    } else {
      firstClick = target;
      selectedElement = target;
      // TODO: is this necessary?
      if ("button" in e && e.button === 0) {
        contextMenuDel();
      }

      if (target.closest(".drawflow_content_node") != null) {
        selectedElement = target.closest(
          ".drawflow_content_node"
        )!.parentElement;
      }
    }

    switch (selectedElement!.classList[0]) {
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
      positionX = touch.touches[0].clientX;
      startPositionX = touch.touches[0].clientX;
      positionY = touch.touches[0].clientY;
      startPositionY = touch.touches[0].clientY;
      mouseX = touch.touches[0].clientX;
      mouseY = touch.touches[0].clientY;
    } else {
      const mouse = e as MouseEvent;
      positionX = mouse.clientX;
      startPositionX = mouse.clientX;
      positionY = mouse.clientY;
      startPositionY = mouse.clientY;
    }
    if (
      ["input", "output", "main-path"].includes(selectedElement!.classList[0])
    ) {
      e.preventDefault();
    }
    dispatch("clickEnd", e);
  };

  const position = (e: MouseEvent | TouchEvent) => {
    let y;
    let x;
    let eventPositionX;
    let eventPositionY;
    if (e.type === "touchmove") {
      const touch = e as TouchEvent;
      eventPositionX = touch.touches[0].clientX;
      eventPositionY = touch.touches[0].clientY;
    } else {
      const mouse = e as MouseEvent;
      eventPositionX = mouse.clientX;
      eventPositionY = mouse.clientY;
    }

    if (connection) {
      updateConnection(eventPositionX, eventPositionY);
    }
    if (isEditorSelected) {
      x = canvasX + -(positionX - eventPositionX);
      y = canvasY + -(positionY - eventPositionY);
      dispatch("translate", { x: x, y: y });
      setPrecanvasTransform(`translate(${x}px, ${y}px) scale(${zoom})`);
    }
    if (drag) {
      e.preventDefault();
      x =
        ((positionX - eventPositionX) * precanvas.clientWidth) /
        (precanvas.clientWidth * zoom);
      y =
        ((positionY - eventPositionY) * precanvas.clientHeight) /
        (precanvas.clientHeight * zoom);
      positionX = eventPositionX;
      positionY = eventPositionY;

      selectedElement!.style.top = `${selectedElement!.offsetTop - y}px`;
      selectedElement!.style.left = `${selectedElement!.offsetLeft - x}px`;

      drawflow[module].data[selectedElement!.id].positionX =
        selectedElement!.offsetLeft - x;
      drawflow[module].data[selectedElement!.id].positionY =
        selectedElement!.offsetTop - y;

      updateConnectionNodes(selectedElement!.id);
    }

    if (dragPoint) {
      // What the hell is this even doing here??
      // x = (positionX - eventPositionX) * precanvas.clientWidth / (precanvas.clientWidth * zoom);
      // y = (positionY - eventPositionY) * precanvas.clientHeight / (precanvas.clientHeight * zoom);
      positionX = eventPositionX;
      positionY = eventPositionY;

      const draggedPositionX =
        positionX * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) -
        precanvas.getBoundingClientRect().x *
          (precanvas.clientWidth / (precanvas.clientWidth * zoom));
      const draggedPositionY =
        positionY * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) -
        precanvas.getBoundingClientRect().y *
          (precanvas.clientHeight / (precanvas.clientHeight * zoom));

      selectedElement!.setAttributeNS(null, "cx", String(draggedPositionX));
      selectedElement!.setAttributeNS(null, "cy", String(draggedPositionY));

      const parentElement = selectedElement!.parentElement!;

      const nodeUpdate = parentElement.classList[2].slice(9);
      const nodeUpdateIn = parentElement.classList[1].slice(8);
      const outputClass = parentElement.classList[3];
      const inputClass = parentElement.classList[4];

      let numberPointPosition =
        Array.from(parentElement.children).indexOf(selectedElement!) - 1;

      if (shouldRerouteFixCurvature) {
        const numberMainPath =
          parentElement.querySelectorAll(".main-path").length - 1;
        numberPointPosition -= numberMainPath;
        if (numberPointPosition < 0) {
          numberPointPosition = 0;
        }
      }

      const nodeId = nodeUpdate.slice(5);
      const searchConnection = drawflow[module].data[nodeId].outputs[
        outputClass
      ].connections.findIndex(
        (item, i) => item.node === nodeUpdateIn && item.output === inputClass
      );

      drawflow[module].data[nodeId].outputs[outputClass].connections[
        searchConnection
      ].points![numberPointPosition] = {
        positionX: draggedPositionX,
        positionY: draggedPositionY,
      };

      const parentSelected = parentElement.classList[2].slice(9);

      updateConnectionNodes(parentSelected);
    }

    if (e.type === "touchmove") {
      mouseX = eventPositionX;
      mouseY = eventPositionY;
    }
    dispatch("mouseMove", { x: eventPositionX, y: eventPositionY });
  };

  const dragEnd = (e: MouseEvent | TouchEvent) => {
    let inputClass;
    let inputId;
    let lastElement;
    let eventPositionX;
    let eventPositionY;
    if (e.type === "touchend") {
      eventPositionX = mouseX;
      eventPositionY = mouseY;
      lastElement = document.elementFromPoint(eventPositionX, eventPositionY)!;
    } else {
      const mouseEvent = e as MouseEvent;
      eventPositionX = mouseEvent.clientX;
      eventPositionY = mouseEvent.clientY;
      lastElement = mouseEvent.target! as HTMLElement;
    }

    if (
      drag &&
      (startPositionX != eventPositionX || startPositionY != eventPositionY)
    ) {
      dispatch("nodeMoved", selectedElement!.id);
    }

    if (dragPoint) {
      selectedElement!.classList.remove("selected");
      if (
        startPositionX != eventPositionX ||
        startPositionY != eventPositionY
      ) {
        dispatch(
          "rerouteMoved",
          selectedElement!.parentElement!.classList[2].slice(9)
        );
      }
    }

    if (isEditorSelected) {
      canvasX = canvasX + -(positionX - eventPositionX);
      canvasY = canvasY + -(positionY - eventPositionY);
      isEditorSelected = false;
    }
    if (connection) {
      if (
        lastElement.classList[0] === "input" ||
        (shouldForceFirstInput &&
          (lastElement.closest(".drawflow_content_node") != null ||
            lastElement.classList[0] === "drawflow-node"))
      ) {
        if (
          shouldForceFirstInput &&
          (lastElement.closest(".drawflow_content_node") != null ||
            lastElement.classList[0] === "drawflow-node")
        ) {
          inputId =
            lastElement.closest(".drawflow_content_node") != null
              ? lastElement.closest(".drawflow_content_node")!.parentElement!.id
              : lastElement.id;
          inputClass =
            Object.keys(getNodeFromId(inputId.slice(5)).inputs).length === 0
              ? ""
              : "input_1";
        } else {
          // Fix connection;
          inputId = lastElement.parentElement!.parentElement!.id;
          inputClass = lastElement.classList[1];
        }
        const outputId = selectedElement!.parentElement!.parentElement!.id;
        const outputClass = selectedElement!.classList[1];

        if (outputId !== inputId && inputClass !== "") {
          if (
            container.querySelectorAll(
              `.connection.node_in_${inputId}.node_out_${outputId}.${outputClass}.${inputClass}`
            ).length === 0
          ) {
            // Connection doesn't exist, save connection
            getConnectionElement().setProps({
              ...getConnectionElement().props(),
              connectionsString: `node_in_${inputId} node_out_${outputId} ${outputClass} ${inputClass}`,
            });

            drawflow[module].data[outputId].outputs[
              outputClass
            ].connections.push({
              node: inputId,
              output: inputClass,
            });
            drawflow[module].data[inputId].inputs[inputClass].connections.push({
              node: outputId,
              input: outputClass,
            });
            updateConnectionNodes(outputId);
            updateConnectionNodes(inputId);
            dispatch("connectionCreated", {
              outputId: outputId,
              inputId: inputId,
              outputClass: outputClass,
              inputClass: inputClass,
            });
          } else {
            dispatch("connectionCancel", true);
            setNodeConnections([...nodeConnections().slice(0, -1)]);
          }
        } else {
          // Connection exists Remove Connection;
          dispatch("connectionCancel", true);
          setNodeConnections([...nodeConnections().slice(0, -1)]);
        }
      } else {
        // Remove Connection;
        dispatch("connectionCancel", true);
        setNodeConnections([...nodeConnections().slice(0, -1)]);
      }
    }

    drag = false;
    dragPoint = false;
    connection = false;
    selectedElement = null;
    isEditorSelected = false;

    dispatch("mouseUp", e);
  };

  const contextMenu = (e: MouseEvent): void => {
    dispatch("contextMenu", e);
    e.preventDefault();
    if (editorMode === "fixed" || editorMode === "view") {
      return;
    }
    contextMenuDel();
    if (selectedNode) {
      nodeElements()[selectedNode.id].setHasDeleteBox(true);
    } else if (selectedConnection) {
      const style: StyleType = {};
      if (selectedConnection.parentElement!.classList.length > 1) {
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
      setDeleteBoxProps({ style });
    }
  };

  const contextMenuDel = (): void => {
    if (selectedNode) {
      nodeElements()[selectedNode.id].setHasDeleteBox(false);
    }
    setDeleteBoxProps({});
  };

  const key = (e: KeyboardEvent): void => {
    dispatch("keydown", e);
    if (editorMode === "fixed" || editorMode === "view") {
      return;
    }
    if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
      if (
        selectedNode != null &&
        firstClick &&
        firstClick.tagName !== "INPUT" &&
        firstClick.tagName !== "TEXTAREA" &&
        !firstClick.hasAttribute("contenteditable")
      ) {
        removeNodeId(selectedNode.id);
      }
      if (selectedConnection != null) {
        removeConnection();
      }
    }
  };

  const onZoom = (event: WheelEvent): void => {
    if (!event.ctrlKey) {
      return;
    }
    event.preventDefault();
    if (event.deltaY > 0) {
      // Zoom Out
      zoomOut();
    } else {
      // Zoom In
      zoomIn();
    }
  };

  const refreshZoom = (): void => {
    dispatch("zoom", zoom);
    canvasX = (canvasX / lastZoom) * zoom;
    canvasY = (canvasY / lastZoom) * zoom;
    lastZoom = zoom;
    setPrecanvasTransform(
      `translate(${canvasX}px, ${canvasY}px) scale(${zoom})`
    );
  };

  const zoomIn = (): void => {
    if (zoom < maxZoom) {
      zoom += zoomAmount;
      refreshZoom();
    }
  };

  const zoomOut = (): void => {
    if (zoom > minZoom) {
      zoom -= zoomAmount;
      refreshZoom();
    }
  };

  const resetZoom = (): void => {
    if (zoom != 1) {
      zoom = 1;
      refreshZoom();
    }
  };

  const createCurvature = (
    lineX: number,
    lineY: number,
    endPositionX: number,
    endPositionY: number,
    curvature: number,
    type: CurvatureType
  ): string => {
    let hx2;
    let hx1;
    switch (type) {
      case "open":
        if (lineX >= endPositionX) {
          hx1 = lineX + Math.abs(endPositionX - lineX) * curvature;
          hx2 =
            endPositionX - Math.abs(endPositionX - lineX) * (curvature * -1);
        } else {
          hx1 = lineX + Math.abs(endPositionX - lineX) * curvature;
          hx2 = endPositionX - Math.abs(endPositionX - lineX) * curvature;
        }
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${endPositionY} ${endPositionX}  ${endPositionY}`;
      case "close":
        if (lineX >= endPositionX) {
          hx1 = lineX + Math.abs(endPositionX - lineX) * (curvature * -1);
          hx2 = endPositionX - Math.abs(endPositionX - lineX) * curvature;
        } else {
          hx1 = lineX + Math.abs(endPositionX - lineX) * curvature;
          hx2 = endPositionX - Math.abs(endPositionX - lineX) * curvature;
        }
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${endPositionY} ${endPositionX}  ${endPositionY}`;
      case "other":
        if (lineX >= endPositionX) {
          hx1 = lineX + Math.abs(endPositionX - lineX) * (curvature * -1);
          hx2 =
            endPositionX - Math.abs(endPositionX - lineX) * (curvature * -1);
        } else {
          hx1 = lineX + Math.abs(endPositionX - lineX) * curvature;
          hx2 = endPositionX - Math.abs(endPositionX - lineX) * curvature;
        }
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${endPositionY} ${endPositionX}  ${endPositionY}`;
      default:
        hx1 = lineX + Math.abs(endPositionX - lineX) * curvature;
        hx2 = endPositionX - Math.abs(endPositionX - lineX) * curvature;
        return ` M ${lineX} ${lineY} C ${hx1} ${lineY} ${hx2} ${endPositionY} ${endPositionX}  ${endPositionY}`;
    }
  };

  const drawConnection = (ele: Element): void => {
    const [props, setProps] = createSignal({});
    setNodeConnections([...nodeConnections(), { props, setProps }]);
    const outputId = ele.parentElement?.parentElement?.id;
    const outputClass = ele.classList[1];
    dispatch("connectionStart", {
      outputId,
      outputClass,
    });
  };

  const updateConnection = (eX: number, eY: number): void => {
    let precanvasWidthZoom =
      precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWidthZoom = precanvasWidthZoom || 0;
    let precanvasHeightZoom =
      precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;

    const lineX =
      selectedElement!.offsetWidth / 2 +
      (selectedElement!.getBoundingClientRect().x -
        precanvas.getBoundingClientRect().x) *
        precanvasWidthZoom;
    const lineY =
      selectedElement!.offsetHeight / 2 +
      (selectedElement!.getBoundingClientRect().y -
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
    getConnectionElement().setProps({
      ...getConnectionElement().props(),
      path: lineCurve,
    });
  };

  const addConnection = (
    outputId: string,
    inputId: string,
    outputClass: string,
    inputClass: string
  ): void => {
    const nodeOneModule = getModuleFromNodeId(outputId);
    const nodeTwoModule = getModuleFromNodeId(inputId);
    if (nodeOneModule !== nodeTwoModule) {
      return;
    }
    const dataNode = getNodeFromId(outputId);
    let exist = dataNode.outputs[outputClass].connections.find(
      (connection) =>
        connection.node == inputId && connection.output == inputClass
    );
    if (exist) {
      return;
    }
    drawflow[nodeOneModule].data[outputId].outputs[
      outputClass
    ].connections.push({
      node: inputId,
      output: inputClass,
    });
    drawflow[nodeOneModule].data[inputId].inputs[inputClass].connections.push({
      node: outputId,
      input: outputClass,
    });
    if (module === nodeOneModule) {
      //Draw connection
      const [props, setProps] = createSignal({
        connectionsString: `connection node_in_${inputId} node_out_${outputId} ${outputClass} ${inputClass}`,
        path: "",
      });
      setNodeConnections([...nodeConnections(), { props, setProps }]);

      updateConnectionNodes(outputId);
      updateConnectionNodes(inputId);
    }
    dispatch("connectionCreated", {
      outputId: outputId,
      inputId: inputId,
      outputClass: outputClass,
      inputClass: inputClass,
    });
  };

  const updateConnectionNodes = (id: string): void => {
    const idSearch = `node_in_${id}`;
    const idSearchOut = `node_out_${id}`;
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
        const elementSearchIdOut = container.querySelector(`[id="${id}"]`);

        const searchId = elem.classList[1].replace("node_in_", "");
        const searchIdElement = container.querySelector(`[id="${searchId}"]`);

        const elementSearch = searchIdElement!.querySelectorAll(
          `.${elem.classList[4]}`
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

        const elementSearchOut = elementSearchIdOut!.querySelectorAll(
          `.${elem.classList[3]}`
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
        const rerouteFix: string[] = [];
        points.forEach((point: Element, i: number) => {
          let elementSearchOut;
          let elementSearch;
          if (i === 0) {
            let elementSearchIdOut = container.querySelector(`[id="${id}"]`);
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

            elementSearchOut = elementSearchIdOut!.querySelectorAll(
              `.${elementSearch.parentElement!.classList[3]}`
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
              rerouteCurvatureStartEnd,
              "open"
            );
            linecurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
            if (points.length - 1 === 0) {
              elementSearchIdOut = point;
              const searchId =
                elementSearchIdOut.parentElement!.classList[1].replace(
                  "node_in_",
                  ""
                );
              const elementSearchId = container.querySelector(
                `[id="${searchId}"]`
              );

              const elementSearchIn = elementSearchId!.querySelectorAll(
                `.${elementSearchIdOut.parentElement!.classList[4]}`
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
                (elementSearchIdOut.getBoundingClientRect().x -
                  precanvas.getBoundingClientRect().x) *
                  precanvasWidthZoom +
                rerouteWidth;
              lineY =
                (elementSearchIdOut.getBoundingClientRect().y -
                  precanvas.getBoundingClientRect().y) *
                  precanvasHeightZoom +
                rerouteWidth;
              lineCurveSearch = createCurvature(
                lineX,
                lineY,
                eX,
                eY,
                rerouteCurvatureStartEnd,
                "close"
              );
              linecurve += lineCurveSearch;
              rerouteFix.push(lineCurveSearch);
            } else {
              elementSearchIdOut = point;
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
                (elementSearchIdOut.getBoundingClientRect().x -
                  precanvas.getBoundingClientRect().x) *
                  precanvasWidthZoom +
                rerouteWidth;
              lineY =
                (elementSearchIdOut.getBoundingClientRect().y -
                  precanvas.getBoundingClientRect().y) *
                  precanvasHeightZoom +
                rerouteWidth;

              lineCurveSearch = createCurvature(
                lineX,
                lineY,
                eX,
                eY,
                rerouteCurvature,
                "other"
              );
              linecurve += lineCurveSearch;
              rerouteFix.push(lineCurveSearch);
            }
          } else if (i === points.length - 1) {
            const elementSearchIdOut = point;

            const searchId =
              elementSearchIdOut.parentElement!.classList[1].replace(
                "node_in_",
                ""
              );
            const elementSearchId = container.querySelector(
              `[id="${searchId}"]`
            );

            const elementSearchIn = elementSearchId!.querySelectorAll(
              `.${elementSearchIdOut.parentElement!.classList[4]}`
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
              (elementSearchIdOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            let lineY =
              (elementSearchIdOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              rerouteCurvatureStartEnd,
              "close"
            );
            linecurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          } else {
            const elementSearchIdOut = point;
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
              (elementSearchIdOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            let lineY =
              (elementSearchIdOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              rerouteCurvature,
              "other"
            );
            linecurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          }
        });
        if (shouldRerouteFixCurvature) {
          rerouteFix.forEach((itempath, i) => {
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
        let elementSearchIdIn = container.querySelector(
          `[id="${id}"]`
        ) as HTMLElement;

        const searchId = elem.classList[2].replace("node_out_", "");
        const elementSearchId = container.querySelector(`[id="${searchId}"]`);
        const elementSearch = elementSearchId!.querySelectorAll(
          `.${elem.classList[3]}`
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

        elementSearchIdIn = elementSearchIdIn!.querySelectorAll(
          `.${elem.classList[4]}`
        )[0] as HTMLElement;
        const x =
          elementSearchIdIn.offsetWidth / 2 +
          (elementSearchIdIn.getBoundingClientRect().x -
            precanvas.getBoundingClientRect().x) *
            precanvasWidthZoom;
        const y =
          elementSearchIdIn.offsetHeight / 2 +
          (elementSearchIdIn.getBoundingClientRect().y -
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
            let elementSearchIdOut = container.querySelector(`[id="${id}"]`);
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

            let elementSearchIn = elementSearchIdOut!.querySelectorAll(
              `.${elementSearch.parentElement!.classList[4]}`
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
              rerouteCurvatureStartEnd,
              "close"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);

            elementSearchIdOut = point;
            let searchId =
              elementSearchIdOut.parentElement!.classList[2].replace(
                "node_out_",
                ""
              );
            let elementSearchId = container.querySelector(`[id="${searchId}"]`);

            let elementSearchOut = elementSearchId!.querySelectorAll(
              `.${elementSearchIdOut.parentElement!.classList[3]}`
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
              (elementSearchIdOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            eY =
              (elementSearchIdOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              rerouteCurvatureStartEnd,
              "open"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          } else if (i === 0) {
            // FIRST
            let elementSearchIdOut = point;
            let searchId =
              elementSearchIdOut.parentElement!.classList[2].replace(
                "node_out_",
                ""
              );
            let elementSearchId = container.querySelector(`[id="${searchId}"]`);

            let elementSearchOut = elementSearchId!.querySelectorAll(
              `.${elementSearchIdOut.parentElement!.classList[3]}`
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
              (elementSearchIdOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let eY =
              (elementSearchIdOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              rerouteCurvatureStartEnd,
              "open"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);

            // SECOND
            elementSearchIdOut = point;
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
              (elementSearchIdOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            lineY =
              (elementSearchIdOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              rerouteCurvature,
              "other"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          } else if (i === points.length - 1) {
            let elementSearchIdOut = point;

            let searchId =
              elementSearchIdOut.parentElement!.classList[1].replace(
                "node_in_",
                ""
              );
            let elementSearchId = container.querySelector(`[id="${searchId}"]`);

            let elementSearchIn = elementSearchId!.querySelectorAll(
              `.${elementSearchIdOut.parentElement!.classList[4]}`
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
              (elementSearchIdOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let lineY =
              (elementSearchIdOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              rerouteCurvatureStartEnd,
              "close"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          } else {
            let elementSearchIdOut = point;
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
              (elementSearchIdOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWidthZoom +
              rerouteWidth;
            let lineY =
              (elementSearchIdOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            let lineCurveSearch = createCurvature(
              lineX,
              lineY,
              eX,
              eY,
              rerouteCurvature,
              "other"
            );
            lineCurve += lineCurveSearch;
            rerouteFix.push(lineCurveSearch);
          }
        });
        if (shouldRerouteFixCurvature) {
          rerouteFix.forEach((itemPath, i) => {
            elem.children[i].setAttributeNS(null, "d", itemPath);
          });
        } else {
          elem.children[0].setAttributeNS(null, "d", lineCurve);
        }
      }
    });
  };

  const onDoubleClick = (e: MouseEvent | TouchEvent): void => {
    if (selectedConnection != null && reroute) {
      createReroutePoint(selectedConnection);
    }
    const target = e.target as Element;
    if (target.classList[0] === "point") {
      removeReroutePoint(target);
    }
  };

  const createReroutePoint = (ele: Element): void => {
    selectedConnection!.classList.remove("selected");
    const parentElement = ele.parentElement!;
    const nodeUpdate = selectedConnection!.parentElement!.classList[2].slice(9);
    const nodeUpdateIn =
      selectedConnection!.parentElement!.classList[1].slice(8);
    const outputClass = selectedConnection!.parentElement!.classList[3];
    const inputClass = selectedConnection!.parentElement!.classList[4];
    selectedConnection = null;
    const point = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    point.classList.add("point");
    const newPositionX =
      positionX * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) -
      precanvas.getBoundingClientRect().x *
        (precanvas.clientWidth / (precanvas.clientWidth * zoom));
    const newPositionY =
      positionY * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) -
      precanvas.getBoundingClientRect().y *
        (precanvas.clientHeight / (precanvas.clientHeight * zoom));

    point.setAttributeNS(null, "cx", String(newPositionX));
    point.setAttributeNS(null, "cy", String(newPositionY));
    point.setAttributeNS(null, "r", String(rerouteWidth));

    let positionAddArrayPoint = 0;
    if (shouldRerouteFixCurvature) {
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
        const searchPoint = Array.from(parentElement.children).indexOf(ele);
        positionAddArrayPoint = searchPoint;
        parentElement.insertBefore(
          point,
          parentElement.children[searchPoint + numberPoints + 1]
        );
      }
    } else {
      parentElement.appendChild(point);
    }

    const nodeId = nodeUpdate.slice(5);
    const searchConnection = drawflow[module].data[nodeId].outputs[
      outputClass
    ].connections.findIndex(
      (item, i) => item.node === nodeUpdateIn && item.output === inputClass
    );

    if (
      drawflow[module].data[nodeId].outputs[outputClass].connections[
        searchConnection
      ].points === undefined
    ) {
      drawflow[module].data[nodeId].outputs[outputClass].connections[
        searchConnection
      ].points = [];
    }

    if (shouldRerouteFixCurvature) {
      if (
        positionAddArrayPoint > 0 ||
        drawflow[module].data[nodeId].outputs[outputClass].connections[
          searchConnection
        ].points!.length !== 0
      ) {
        drawflow[module].data[nodeId].outputs[outputClass].connections[
          searchConnection
        ].points!.splice(positionAddArrayPoint, 0, {
          positionX: newPositionX,
          positionY: newPositionY,
        });
      } else {
        drawflow[module].data[nodeId].outputs[outputClass].connections[
          searchConnection
        ].points!.push({
          positionX: newPositionX,
          positionY: newPositionY,
        });
      }

      parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });
    } else {
      drawflow[module].data[nodeId].outputs[outputClass].connections[
        searchConnection
      ].points!.push({
        positionX: newPositionX,
        positionY: newPositionY,
      });
    }

    dispatch("addReroute", nodeId);
    updateConnectionNodes(nodeUpdate);
  };

  const removeReroutePoint = (ele: Element): void => {
    const parentElement = ele.parentElement!;
    const nodeUpdate = parentElement.classList[2].slice(9);
    const nodeUpdateIn = parentElement.classList[1].slice(8);
    const outputClass = parentElement.classList[3];
    const inputClass = parentElement.classList[4];

    let numberPointPosition = Array.from(parentElement.children).indexOf(ele);
    const nodeId = nodeUpdate.slice(5);
    const searchConnection = drawflow[module].data[nodeId].outputs[
      outputClass
    ].connections.findIndex(
      (item: DrawflowOutputConnection) =>
        item.node === nodeUpdateIn && item.output === inputClass
    );

    if (shouldRerouteFixCurvature) {
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
    drawflow[module].data[nodeId].outputs[outputClass].connections[
      searchConnection
    ].points!.splice(numberPointPosition, 1);

    ele.remove();
    dispatch("removeReroute", nodeId);
    updateConnectionNodes(nodeUpdate);
  };

  const getNodeFromId = (id: string): DrawflowNodeType => {
    const moduleName: string = getModuleFromNodeId(id);
    return JSON.parse(JSON.stringify(drawflow[moduleName].data[id]));
  };

  const getNodesFromName = (name: string): string[] => {
    const nodes: string[] = [];
    const editor = drawflow;
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
    nodePositionX: number,
    nodePositionY: number,
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

    const [hasDeleteBox, setHasDeleteBox] = createSignal(false);
    const [nodeProps, setNodeProps] = createSignal({
      inputs,
      outputs,
      positionX: nodePositionX,
      positionY: nodePositionY,
      classList,
      id: newNodeId,
    });
    setNodeElements({
      ...nodeElements(),
      [newNodeId]: {
        node: ContentNodeComponent,
        props: nodeProps,
        setProps: setNodeProps,
        hasDeleteBox,
        setHasDeleteBox,
      },
    });

    const jsonInputs: DrawflowInputs = {};
    for (let x = 0; x < inputs; ++x) {
      jsonInputs[`input_${x + 1}`] = { connections: [] };
    }
    const jsonOutputs: DrawflowOutputs = {};
    for (let x = 0; x < outputs; x++) {
      jsonOutputs[`output_${x + 1}`] = { connections: [] };
    }
    drawflow[module].data[newNodeId] = {
      id: newNodeId,
      name,
      data,
      inputs: jsonInputs,
      outputs: jsonOutputs,
      positionX: nodePositionX,
      positionY: nodePositionY,
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
  //       connection.classList.add("node_in_" + dataNode.id);
  //       connection.classList.add("node_out_" + output_item.node);
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
  //   node.style.top = dataNode.positionY + "px";
  //   node.style.left = dataNode.positionX + "px";
  //   parent.appendChild(node);
  //   precanvas.appendChild(parent);
  // };

  const addRerouteImport = (dataNode: DrawflowNodeType) => {
    Object.keys(dataNode.outputs).map((outputItem) => {
      Object.keys(dataNode.outputs[outputItem].connections).map((inputItem) => {
        const el = dataNode.outputs[outputItem].connections[Number(inputItem)];
        const points = el.points;
        if (points !== undefined) {
          points.forEach((point, i) => {
            const inputId = el.node;
            const inputClass = el.output;
            const ele = container.querySelector(
              `.connection.node_in_${inputId}.node_out_${dataNode.id}.${outputItem}.${inputClass}`
            )!;

            if (shouldRerouteFixCurvature) {
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
            const itemPositionX = point.positionX;
            const itemPositionY = point.positionY;

            pointElement.setAttributeNS(null, "cx", String(itemPositionX));
            pointElement.setAttributeNS(null, "cy", String(itemPositionY));
            pointElement.setAttributeNS(null, "r", String(rerouteWidth));

            ele.appendChild(pointElement);
          });
        }
      });
    });
  };

  const updateNodeValue = (event: InputEvent) => {
    const eventTarget = event.target as HTMLInputElement;
    const attr = eventTarget.attributes;
    for (let i = 0; i < attr.length; i++) {
      if (attr[i].nodeName.startsWith("df-")) {
        const keys = attr[i].nodeName.slice(3).split("-");
        let target =
          drawflow[module].data[
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
  //   drawflow[moduleName].data[id].data = data;
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
      const node = Object.values(nodeElements()).find(
        (el) => el.props().id === id
      );
      if (node) {
        node.setProps({ ...node.props(), inputs: numInputs + 1 });
      }
      updateConnectionNodes(id);
    }
    drawflow[moduleName].data[id].inputs[`input_${numInputs + 1}`] = {
      connections: [],
    };
  };

  const addNodeOutput = (id: string): void => {
    const moduleName = getModuleFromNodeId(id);
    const infoNode = getNodeFromId(id);
    const numOutputs = Object.keys(infoNode.outputs).length;
    if (module === moduleName) {
      //Draw output
      const node = Object.values(nodeElements()).find(
        (el) => el.props().id === id
      );
      if (node) {
        node.setProps({ ...node.props(), outputs: numOutputs + 1 });
      }
      updateConnectionNodes(id);
    }
    drawflow[moduleName].data[id].outputs[`output_${numOutputs + 1}`] = {
      connections: [],
    };
  };

  const removeNodeInput = (id: string, inputClass: string): void => {
    const moduleName = getModuleFromNodeId(id);
    const infoNode = getNodeFromId(id);
    if (module === moduleName) {
      container
        .querySelector(`[id="${id}"] .inputs .input.${inputClass}`)!
        .remove();
    }
    const removeInputs: {
      outputId: string;
      inputId: string;
      outputClass: string;
      inputClass: string;
    }[] = [];
    Object.keys(infoNode.inputs[inputClass].connections).map((key, index) => {
      const outputId = infoNode.inputs[inputClass].connections[index].node;
      const outputClass = infoNode.inputs[inputClass].connections[index].input;
      removeInputs.push({ outputId, inputId: id, outputClass, inputClass });
    });
    // Remove connections
    removeInputs.forEach((item, i) => {
      removeSingleConnection(
        item.outputId,
        item.inputId,
        item.outputClass,
        item.inputClass
      );
    });

    delete drawflow[moduleName].data[id].inputs[inputClass];

    // TODO: change how input/output ids work
    // Update connection
    // const connections: { connections: DrawflowInputConnection[] }[] = [];
    // const connectionsInputs = drawflow[moduleName].data[id].inputs;
    // Object.keys(connectionsInputs).map((key, index) => {
    //   connections.push(connectionsInputs[key]);
    // });
    // drawflow[moduleName].data[id].inputs = {};
    // const input_class_id = inputClass.slice(6);
    // let nodeUpdates: DrawflowInputConnection[] = [];
    // connections.forEach((item, i) => {
    //   item.connections.forEach((itemx, f) => {
    //     nodeUpdates.push(itemx);
    //   });
    //   drawflow[moduleName].data[id].inputs[`input_${i + 1}`] = item;
    // });
    // let nodeUpdatesSet = new Set(nodeUpdates.map((e) => JSON.stringify(e)));
    // nodeUpdates = Array.from(nodeUpdatesSet).map((e) => JSON.parse(e));
    //
    // if (module === moduleName) {
    //   const eles = container.querySelectorAll(`#${id} .inputs .input`);
    //   eles.forEach((item, i) => {
    //     const id_class = Number(item.classList[1].slice(6));
    //     if (parseInt(input_class_id) < id_class) {
    //       item.classList.remove(`input_${id_class}`);
    //       item.classList.add(`input_${id_class - 1}`);
    //     }
    //   });
    // }
    //
    // nodeUpdates.forEach((itemx, i) => {
    //   drawflow[moduleName].data[itemx.node].outputs[
    //     itemx.input
    //   ].connections.forEach((itemz, g) => {
    //     if (itemz.node == id) {
    //       const output_id = Number(itemz.output.slice(6));
    //       if (parseInt(input_class_id) < output_id) {
    //         if (module === moduleName) {
    //           const ele = container.querySelector(
    //             `.connection.node_in_${id}.node_out_${itemx.node}.${itemx.input}.input_${output_id}`
    //           ) as HTMLElement;
    //           ele.classList.remove(`input_${output_id}`);
    //           ele.classList.add(`input_${output_id - 1}`);
    //         }
    //         if (itemz.points) {
    //           drawflow[moduleName].data[itemx.node].outputs[
    //             itemx.input
    //           ].connections[g] = {
    //             node: itemz.node,
    //             output: `input_${output_id - 1}`,
    //             points: itemz.points,
    //           };
    //         } else {
    //           drawflow[moduleName].data[itemx.node].outputs[
    //             itemx.input
    //           ].connections[g] = {
    //             node: itemz.node,
    //             output: `input_${output_id - 1}`,
    //           };
    //         }
    //       }
    //     }
    //   });
    // });

    updateConnectionNodes(id);
  };

  const removeNodeOutput = (id: string, outputClass: string) => {
    const moduleName = getModuleFromNodeId(id);
    const infoNode = getNodeFromId(id);
    if (module === moduleName) {
      container
        .querySelector(`[id="${id}"] .outputs .output.${outputClass}`)!
        .remove();
    }
    const removeOutputs: {
      outputId: string;
      inputId: string;
      outputClass: string;
      inputClass: string;
    }[] = [];
    Object.keys(infoNode.outputs[outputClass].connections).map((key, index) => {
      const inputId = infoNode.outputs[outputClass].connections[index].node;
      const inputClass =
        infoNode.outputs[outputClass].connections[index].output;
      removeOutputs.push({
        outputId: id,
        inputId,
        outputClass,
        inputClass,
      });
    });
    // Remove connections
    removeOutputs.forEach((item) => {
      removeSingleConnection(
        item.outputId,
        item.inputId,
        item.outputClass,
        item.inputClass
      );
    });

    delete drawflow[moduleName].data[id].outputs[outputClass];

    // TODO: change how input/output ids work
    // Update connection
    // const connections: { connections: DrawflowOutputConnection[] }[] = [];
    // const connectionOutputs = drawflow[moduleName].data[id].outputs;
    // Object.keys(connectionOutputs).forEach((key) => {
    //   connections.push(connectionOutputs[Number(key)]);
    // });
    // drawflow[moduleName].data[id].outputs = {};
    // const output_class_id = outputClass.slice(7);
    // let nodeUpdates: DrawflowOutputConnection[] = [];
    // connections.forEach((item, i) => {
    //   item.connections.forEach((itemx, f) => {
    //     nodeUpdates.push({ node: itemx.node, output: itemx.output });
    //   });
    //   drawflow[moduleName].data[id].outputs[`output_${i + 1}`] = item;
    // });
    // let nodeUpdatesSet = new Set(nodeUpdates.map((e) => JSON.stringify(e)));
    // nodeUpdates = Array.from(nodeUpdatesSet).map((e) => JSON.parse(e));
    //
    // if (module === moduleName) {
    //   const eles = container.querySelectorAll(`#node-${id} .outputs .output`);
    //   eles.forEach((item) => {
    //     const id_class = item.classList[1].slice(7);
    //     if (parseInt(output_class_id) < parseInt(id_class)) {
    //       item.classList.remove(`output_${id_class}`);
    //       item.classList.add(`output_${Number(id_class) - 1}`);
    //     }
    //   });
    // }
    //
    // nodeUpdates.forEach((itemx, i) => {
    //   drawflow[moduleName].data[itemx.node].inputs[
    //     itemx.output
    //   ].connections.forEach((itemz, g) => {
    //     if (itemz.node == id) {
    //       const input_id = Number(itemz.input.slice(7));
    //       if (parseInt(output_class_id) < input_id) {
    //         if (module === moduleName) {
    //           const ele = container.querySelector(
    //             `.connection.node_in_${itemx.node}.node_out_${id}.output_${input_id}.${itemx.output}`
    //           )!;
    //           ele.classList.remove(`output_${input_id}`);
    //           ele.classList.remove(itemx.output);
    //           ele.classList.add(`output_${input_id - 1}`);
    //           ele.classList.add(itemx.output);
    //         }
    //         if (itemz.points) {
    //           drawflow[moduleName].data[itemx.node].inputs[
    //             itemx.output
    //           ].connections[g] = {
    //             node: itemz.node,
    //             input: `output_${input_id - 1}`,
    //             points: itemz.points,
    //           };
    //         } else {
    //           drawflow[moduleName].data[itemx.node].inputs[
    //             itemx.output
    //           ].connections[g] = {
    //             node: itemz.node,
    //             input: `output_${input_id - 1}`,
    //           };
    //         }
    //       }
    //     }
    //   });
    // });

    updateConnectionNodes(id);
  };

  const removeNodeId = (id: string): void => {
    removeConnectionNodeId(id);
    const moduleName = getModuleFromNodeId(id);
    if (module === moduleName) {
      container.querySelector(`[id="${id}"]`)!.remove();
    }
    delete drawflow[moduleName].data[id];
    dispatch("nodeRemoved", id);
  };

  const removeConnection = () => {
    if (selectedConnection != null) {
      const listClass = selectedConnection.parentElement!.classList;
      selectedConnection.parentElement!.remove();
      const indexOut = drawflow[module].data[listClass[2].slice(9)].outputs[
        listClass[3]
      ].connections.findIndex(
        (item, i) =>
          item.node === listClass[1].slice(8) && item.output === listClass[4]
      );
      drawflow[module].data[listClass[2].slice(9)].outputs[
        listClass[3]
      ].connections.splice(indexOut, 1);

      const indexIn = drawflow[module].data[listClass[1].slice(8)].inputs[
        listClass[4]
      ].connections.findIndex(
        (item, i) =>
          item.node === listClass[2].slice(9) && item.input === listClass[3]
      );
      drawflow[module].data[listClass[1].slice(8)].inputs[
        listClass[4]
      ].connections.splice(indexIn, 1);

      dispatch("connectionRemoved", {
        outputId: listClass[2].slice(9),
        inputId: listClass[1].slice(8),
        outputClass: listClass[3],
        inputClass: listClass[4],
      });
      selectedConnection = null;
    }
  };

  const removeSingleConnection = (
    outputId: string,
    inputId: string,
    outputClass: string,
    inputClass: string
  ): boolean => {
    const nodeOneModule = getModuleFromNodeId(outputId);
    const nodeTwoModule = getModuleFromNodeId(inputId);
    // Check nodes in same module.
    if (nodeOneModule !== nodeTwoModule) {
      return false;
    }
    // Check connection exist
    const exists = drawflow[nodeOneModule].data[outputId].outputs[
      outputClass
    ].connections.findIndex(
      (item, i) => item.node == inputId && item.output === inputClass
    );
    if (exists <= -1) {
      return false;
    }
    // In same module with view.
    if (module === nodeOneModule) {
      container
        .querySelector(
          `.connection.node_in_${inputId}.node_out_${outputId}.${outputClass}.${inputClass}`
        )!
        .remove();
    }

    const indexOut = drawflow[nodeOneModule].data[outputId].outputs[
      outputClass
    ].connections.findIndex(
      (item, i) => item.node == inputId && item.output === inputClass
    );
    drawflow[nodeOneModule].data[outputId].outputs[
      outputClass
    ].connections.splice(indexOut, 1);

    const indexIn = drawflow[nodeOneModule].data[inputId].inputs[
      inputClass
    ].connections.findIndex(
      (item, i) => item.node == outputId && item.input === outputClass
    );
    drawflow[nodeOneModule].data[inputId].inputs[inputClass].connections.splice(
      indexIn,
      1
    );

    dispatch("connectionRemoved", {
      outputId,
      inputId,
      outputClass,
      inputClass,
    });
    return true;
  };

  const removeConnectionNodeId = (id: string): void => {
    const idSearchIn = `node_in_${id}`;
    const idSearchOut = `node_out_${id}`;

    const elemsOut = container.querySelectorAll(`.${idSearchOut}`);
    const elemsIn = container.querySelectorAll(`.${idSearchIn}`);
    removeConnectionNodes(elemsOut);
    removeConnectionNodes(elemsIn);
  };

  const removeConnectionNodes = (elements: NodeListOf<Element>): void => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const classList = elements[i].classList;

      const indexOut = drawflow[module].data[classList[2].slice(9)].outputs[
        classList[3]
      ].connections.findIndex(
        (item, i) =>
          item.node === classList[1].slice(8) && item.output === classList[4]
      );
      drawflow[module].data[classList[2].slice(9)].outputs[
        classList[3]
      ].connections.splice(indexOut, 1);

      const indexIn = drawflow[module].data[classList[1].slice(8)].inputs[
        classList[4]
      ].connections.findIndex(
        (item, i) =>
          item.node === classList[2].slice(9) && item.input === classList[3]
      );
      drawflow[module].data[classList[1].slice(8)].inputs[
        classList[4]
      ].connections.splice(indexIn, 1);

      elements[i].remove();

      dispatch("connectionRemoved", {
        outputId: classList[2].slice(9),
        inputId: classList[1].slice(8),
        outputClass: classList[3],
        inputClass: classList[4],
      });
    }
  };

  const getModuleFromNodeId = (id: string): string => {
    let nameModule = "";
    const editor = drawflow;
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
    drawflow[name] = { data: {} };
    dispatch("moduleCreated", name);
  };

  const changeModule = (name: string): void => {
    dispatch("moduleChanged", name);
    module = name;
    precanvas.innerHTML = "";
    canvasX = 0;
    canvasY = 0;
    positionX = 0;
    positionY = 0;
    mouseX = 0;
    mouseY = 0;
    zoom = 1;
    lastZoom = 1;
    setPrecanvasTransform("");
    importDrawflow(drawflow, false);
  };

  const removeModule = (name: string): void => {
    if (module === name) {
      changeModule("Home");
    }
    delete drawflow[name];
    dispatch("moduleRemoved", name);
  };

  const clearPrecanvas = (): void => {
    setNodeElements({});
    setNodeConnections([]);
    setDeleteBoxProps({});
  };

  const clearModuleSelected = (): void => {
    precanvas.innerHTML = "";
    drawflow[module] = { data: {} };
  };

  const clear = (): void => {
    precanvas.innerHTML = "";
    drawflow = { Home: { data: {} } };
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

  const dispatch = (event: string, details: any): void => {
    // Check if this event not exists
    if (events[event] === undefined) {
      // console.error(`This event: ${event} does not exist`);
      return;
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
      onWheel={onZoom}
      onInput={updateNodeValue}
      onDblClick={onDoubleClick}
      ref={container!}
    >
      <div
        class="drawflow"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMoved}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerOut={handlePointerUp}
        onPointerLeave={handlePointerUp}
        ref={precanvas!}
        style={{
          transform: precanvasTransform(),
        }}
      >
        <For each={Object.keys(nodeElements())}>
          {(nodeId) => {
            const Node = nodeElements()[nodeId].node;
            const props = nodeElements()[nodeId].props;
            return (
              <div class="parent-node">
                <div
                  id={props().id}
                  class="drawflow-node"
                  style={{
                    left: `${props().positionX}px`,
                    top: `${props().positionY}px`,
                  }}
                >
                  <div class="inputs">
                    <For each={[...Array(props().inputs).keys()]}>
                      {(input) => <div class={`input input_${input + 1}`} />}
                    </For>
                  </div>
                  <div class="drawflow_content_node">
                    {<Node {...props()} />}
                  </div>
                  <div class="outputs">
                    <For each={[...Array(props().outputs).keys()]}>
                      {(output) => (
                        <div class={`output output_${output + 1}`} />
                      )}
                    </For>
                  </div>
                  <Show when={nodeElements()[nodeId]?.hasDeleteBox()}>
                    <DeleteBox />
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
        <For each={nodeConnections()}>
          {(connection) => {
            return (
              <svg class={`connection ${connection.props().connectionsString}`}>
                <path class="main-path" d={connection.props().path} />
              </svg>
            );
          }}
        </For>
        <Show when={Object.keys(deleteBoxProps()).length > 0}>
          <DeleteBox style={deleteBoxProps().style} />
        </Show>
      </div>
    </div>
  );
};

export default Drawflow;
