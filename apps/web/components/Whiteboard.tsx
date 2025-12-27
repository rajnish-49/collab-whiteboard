"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWebSocket, type WebSocketMessage } from "@/lib/useWebSocket";

type Tool = "select" | "pen" | "rectangle" | "circle" | "line" | "text" | "eraser";

interface Point {
  x: number;
  y: number;
}

interface BaseElement {
  id: string;
  type: string;
  color: string;
  strokeWidth: number;
}

interface PathElement extends BaseElement {
  type: "path";
  points: Point[];
}

interface RectElement extends BaseElement {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CircleElement extends BaseElement {
  type: "circle";
  x: number;
  y: number;
  radius: number;
}

interface LineElement extends BaseElement {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TextElement extends BaseElement {
  type: "text";
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

type DrawElement = PathElement | RectElement | CircleElement | LineElement | TextElement;

interface WhiteboardProps {
  roomId: string;
  onElementsChange?: (elements: DrawElement[]) => void;
}

export default function Whiteboard({ roomId, onElementsChange }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isRemoteUpdateRef = useRef(false);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === "draw" && message.payload?.elements) {
      isRemoteUpdateRef.current = true;
      setElements(message.payload.elements as DrawElement[]);
    }
  }, []);

  const { connectionState, users, sendDraw } = useWebSocket({
    roomId,
    onMessage: handleWebSocketMessage,
  });

  useEffect(() => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    sendDraw({ elements });
  }, [elements, sendDraw]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    [...elements, currentElement].filter(Boolean).forEach((el) => {
      if (!el) return;

      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (el.type) {
        case "path": {
          if (el.points.length < 2) return;
          const firstPoint = el.points[0];
          if (!firstPoint) return;
          ctx.beginPath();
          ctx.moveTo(firstPoint.x, firstPoint.y);
          for (let i = 1; i < el.points.length; i++) {
            const point = el.points[i];
            if (point) {
              ctx.lineTo(point.x, point.y);
            }
          }
          ctx.stroke();
          break;
        }

        case "rectangle":
          ctx.beginPath();
          ctx.strokeRect(el.x, el.y, el.width, el.height);
          break;

        case "circle":
          ctx.beginPath();
          ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case "line":
          ctx.beginPath();
          ctx.moveTo(el.x1, el.y1);
          ctx.lineTo(el.x2, el.y2);
          ctx.stroke();
          break;

        case "text":
          ctx.font = `${el.fontSize}px sans-serif`;
          ctx.fillText(el.content, el.x, el.y);
          break;
      }

      if (selectedId === el.id) {
        ctx.strokeStyle = "#0070f3";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        const bounds = getElementBounds(el);
        if (bounds) {
          ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
        }
        ctx.setLineDash([]);
      }
    });
  }, [elements, currentElement, selectedId]);

  const getElementBounds = (el: DrawElement): { x: number; y: number; width: number; height: number } | null => {
    switch (el.type) {
      case "path": {
        if (el.points.length === 0) return null;
        const xs = el.points.map((p) => p.x);
        const ys = el.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
      case "rectangle":
        return { x: el.x, y: el.y, width: el.width, height: el.height };
      case "circle":
        return { x: el.x - el.radius, y: el.y - el.radius, width: el.radius * 2, height: el.radius * 2 };
      case "line": {
        const minX = Math.min(el.x1, el.x2);
        const maxX = Math.max(el.x1, el.x2);
        const minY = Math.min(el.y1, el.y2);
        const maxY = Math.max(el.y1, el.y2);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
      case "text":
        return { x: el.x, y: el.y - el.fontSize, width: el.content.length * el.fontSize * 0.6, height: el.fontSize };
      default:
        return null;
    }
  };

  const isPointInElement = (point: Point, el: DrawElement): boolean => {
    const bounds = getElementBounds(el);
    if (!bounds) return false;
    return (
      point.x >= bounds.x - 5 &&
      point.x <= bounds.x + bounds.width + 5 &&
      point.y >= bounds.y - 5 &&
      point.y <= bounds.y + bounds.height + 5
    );
  };

  const saveToHistory = useCallback((newElements: DrawElement[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    onElementsChange?.(elements);
  }, [elements, onElementsChange]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const point = getCoordinates(e);
    if (!point) return;

    if (tool === "select") {
      const clicked = [...elements].reverse().find((el) => isPointInElement(point, el));
      setSelectedId(clicked?.id || null);
      return;
    }

    if (tool === "text") {
      setTextInput({ x: point.x, y: point.y });
      setTextValue("");
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);

    if (tool === "pen" || tool === "eraser") {
      const newElement: PathElement = {
        id: generateId(),
        type: "path",
        color: tool === "eraser" ? "#ffffff" : color,
        strokeWidth: tool === "eraser" ? strokeWidth * 5 : strokeWidth,
        points: [point],
      };
      setCurrentElement(newElement);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPoint) return;

    const point = getCoordinates(e);
    if (!point) return;

    if (tool === "pen" || tool === "eraser") {
      setCurrentElement((prev) => {
        if (!prev || prev.type !== "path") return prev;
        return { ...prev, points: [...prev.points, point] };
      });
    } else if (tool === "rectangle") {
      const newElement: RectElement = {
        id: generateId(),
        type: "rectangle",
        color,
        strokeWidth,
        x: Math.min(startPoint.x, point.x),
        y: Math.min(startPoint.y, point.y),
        width: Math.abs(point.x - startPoint.x),
        height: Math.abs(point.y - startPoint.y),
      };
      setCurrentElement(newElement);
    } else if (tool === "circle") {
      const radius = Math.sqrt(
        Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2)
      );
      const newElement: CircleElement = {
        id: generateId(),
        type: "circle",
        color,
        strokeWidth,
        x: startPoint.x,
        y: startPoint.y,
        radius,
      };
      setCurrentElement(newElement);
    } else if (tool === "line") {
      const newElement: LineElement = {
        id: generateId(),
        type: "line",
        color,
        strokeWidth,
        x1: startPoint.x,
        y1: startPoint.y,
        x2: point.x,
        y2: point.y,
      };
      setCurrentElement(newElement);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentElement) {
      setIsDrawing(false);
      return;
    }

    const newElements = [...elements, currentElement];
    setElements(newElements);
    saveToHistory(newElements);
    setCurrentElement(null);
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleTextSubmit = () => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }

    const newElement: TextElement = {
      id: generateId(),
      type: "text",
      color,
      strokeWidth,
      x: textInput.x,
      y: textInput.y,
      content: textValue,
      fontSize: 20,
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setTextInput(null);
    setTextValue("");
    setTool("select");
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex] || []);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex] || []);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const newElements = elements.filter((el) => el.id !== selectedId);
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedId(null);
  };

  const clearCanvas = () => {
    setElements([]);
    saveToHistory([]);
    setSelectedId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !textInput) {
          deleteSelected();
        }
      }
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, textInput, historyIndex]);

  const toolButtonClass = (t: Tool) =>
    `p-2 border rounded cursor-pointer ${
      tool === t
        ? "bg-blue-500 text-white border-blue-500"
        : "bg-white text-black border-gray-300 hover:bg-gray-100"
    }`;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      <div className="flex gap-2 p-2 bg-gray-100 border-b border-gray-300 flex-wrap items-center">
        <button onClick={() => setTool("select")} className={toolButtonClass("select")} title="Select">
          ↖
        </button>
        <button onClick={() => setTool("pen")} className={toolButtonClass("pen")} title="Pen">
          ✏️
        </button>
        <button onClick={() => setTool("eraser")} className={toolButtonClass("eraser")} title="Eraser">
          🧹
        </button>
        <button onClick={() => setTool("rectangle")} className={toolButtonClass("rectangle")} title="Rectangle">
          ▭
        </button>
        <button onClick={() => setTool("circle")} className={toolButtonClass("circle")} title="Circle">
          ○
        </button>
        <button onClick={() => setTool("line")} className={toolButtonClass("line")} title="Line">
          /
        </button>
        <button onClick={() => setTool("text")} className={toolButtonClass("text")} title="Text">
          T
        </button>

        <div className="w-px h-6 bg-gray-300" />

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 cursor-pointer"
          title="Color"
        />

        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-20"
          title="Stroke Width"
        />
        <span className="text-xs">{strokeWidth}px</span>

        <div className="w-px h-6 bg-gray-300" />

        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className={`p-2 bg-white border border-gray-300 rounded ${
            historyIndex <= 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"
          }`}
          title="Undo (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className={`p-2 bg-white border border-gray-300 rounded ${
            historyIndex >= history.length - 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"
          }`}
          title="Redo (Ctrl+Y)"
        >
          ↪️
        </button>
        <button
          onClick={deleteSelected}
          disabled={!selectedId}
          className={`p-2 bg-white border border-gray-300 rounded ${
            !selectedId ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"
          }`}
          title="Delete Selected"
        >
          🗑️
        </button>
        <button
          onClick={clearCanvas}
          className="p-2 bg-red-500 text-white border-none rounded cursor-pointer hover:bg-red-600"
          title="Clear All"
        >
          Clear
        </button>

        <div className="w-px h-6 bg-gray-300" />

        <div className="flex items-center gap-2 ml-auto">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionState === "connected"
                ? "bg-green-500"
                : connectionState === "connecting"
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            title={`Connection: ${connectionState}`}
          />
          <span className="text-xs text-gray-600">
            {connectionState === "connected"
              ? `${users.length + 1} user${users.length === 0 ? "" : "s"}`
              : connectionState}
          </span>
        </div>
      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`w-full h-full touch-none ${
            tool === "text" ? "cursor-text" : tool === "select" ? "cursor-default" : "cursor-crosshair"
          }`}
        />

        {textInput && (
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
              if (e.key === "Escape") setTextInput(null);
            }}
            autoFocus
            className="absolute text-xl border border-blue-500 px-1 py-0.5 outline-none bg-white min-w-[100px]"
            style={{ left: textInput.x, top: textInput.y - 20 }}
            placeholder="Type text..."
            aria-label="Text input"
          />
        )}
      </div>
    </div>
  );
}
