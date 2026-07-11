"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface DashboardWidget {
  id: string;
  node: ReactNode;
}

interface WidgetSize {
  width: number;
  height: number;
}

interface BoardState {
  order: string[];
  sizes: Record<string, WidgetSize>;
}

function loadState(storageKey: string, defaultOrder: string[]): BoardState {
  if (typeof window === "undefined") return { order: defaultOrder, sizes: {} };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { order: defaultOrder, sizes: {} };
    const parsed = JSON.parse(raw) as BoardState;
    const known = new Set(defaultOrder);
    const restored = parsed.order.filter(id => known.has(id));
    const missing = defaultOrder.filter(id => !restored.includes(id));
    return { order: [...restored, ...missing], sizes: parsed.sizes ?? {} };
  } catch {
    return { order: defaultOrder, sizes: {} };
  }
}

export function DashboardBoard({ widgets, storageKey }: { widgets: DashboardWidget[]; storageKey: string }) {
  const defaultOrder = widgets.map(widget => widget.id);
  const [state, setState] = useState<BoardState>({ order: defaultOrder, sizes: {} });
  const [ready, setReady] = useState(false);
  const draggedId = useRef<string | null>(null);
  const resizeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setState(loadState(storageKey, defaultOrder));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persist(next: BoardState) {
    setState(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, id: string) {
    const handle = (event.target as HTMLElement).closest(".widget-handle");
    if (!handle) {
      event.preventDefault();
      return;
    }
    draggedId.current = id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const order = state.order.slice();
    const from = order.indexOf(sourceId);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, sourceId);
    persist({ ...state, order });
  }

  function handleResizeEnd(id: string, element: HTMLDivElement) {
    clearTimeout(resizeTimers.current[id]);
    resizeTimers.current[id] = setTimeout(() => {
      const width = Math.round(element.offsetWidth);
      const height = Math.round(element.offsetHeight);
      persist({ ...state, sizes: { ...state.sizes, [id]: { width, height } } });
    }, 250);
  }

  const orderedWidgets = ready
    ? state.order.map(id => widgets.find(widget => widget.id === id)).filter((widget): widget is DashboardWidget => Boolean(widget))
    : widgets;

  return (
    <div className="widget-board">
      {orderedWidgets.map(widget => {
        const size = state.sizes[widget.id];
        return (
          <div
            key={widget.id}
            className="widget-card"
            draggable
            onDragStart={event => handleDragStart(event, widget.id)}
            onDragOver={handleDragOver}
            onDrop={event => handleDrop(event, widget.id)}
            onMouseUp={event => handleResizeEnd(widget.id, event.currentTarget)}
            style={size ? { width: size.width, height: size.height } : undefined}
          >
            <div className="widget-handle" title="Arrastrar para reordenar">
              <svg className="icon" viewBox="0 0 24 24">
                <circle cx="8" cy="6" r="1.3" />
                <circle cx="8" cy="12" r="1.3" />
                <circle cx="8" cy="18" r="1.3" />
                <circle cx="16" cy="6" r="1.3" />
                <circle cx="16" cy="12" r="1.3" />
                <circle cx="16" cy="18" r="1.3" />
              </svg>
            </div>
            <div className="widget-content">{widget.node}</div>
          </div>
        );
      })}
    </div>
  );
}
