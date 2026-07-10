import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

export const DETAIL_PANEL_HEADER_HEIGHT = 58;
export const DETAIL_PANEL_COLLAPSED_HEIGHT = DETAIL_PANEL_HEADER_HEIGHT;

const DETAIL_PANEL_DEFAULT_HEIGHT_RATIO = 0.5;
const DETAIL_PANEL_MIN_HEIGHT = 260;
const DETAIL_PANEL_RESIZE_STEP = 40;

export function useFunnelDetailPanelResize() {
  const [detailPanelHeight, setDetailPanelHeight] = useState(() => getDetailPanelDefaultHeight());
  const [isDetailPanelCollapsed, setIsDetailPanelCollapsed] = useState(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      resizeCleanupRef.current?.();
    },
    []
  );

  function handleDetailPanelResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      resizeDetailPanelBy(DETAIL_PANEL_RESIZE_STEP);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      resizeDetailPanelBy(-DETAIL_PANEL_RESIZE_STEP);
      return;
    }
    if (event.key === "PageUp") {
      event.preventDefault();
      resizeDetailPanelBy(DETAIL_PANEL_RESIZE_STEP * 3);
      return;
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      resizeDetailPanelBy(-DETAIL_PANEL_RESIZE_STEP * 3);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setIsDetailPanelCollapsed(false);
      setDetailPanelHeight(DETAIL_PANEL_MIN_HEIGHT);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setIsDetailPanelCollapsed(false);
      setDetailPanelHeight(getDetailPanelMaxHeight());
    }
  }

  function resizeDetailPanelBy(delta: number) {
    setIsDetailPanelCollapsed(false);
    setDetailPanelHeight((current) => clampDetailPanelHeight(current + delta));
  }

  function startDetailPanelResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDetailPanelCollapsed(false);
    resizeCleanupRef.current?.();

    const startY = event.clientY;
    const startHeight = isDetailPanelCollapsed
      ? Math.max(detailPanelHeight, getDetailPanelDefaultHeight())
      : detailPanelHeight;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";

    function handlePointerMove(pointerEvent: PointerEvent) {
      const nextHeight = startHeight + startY - pointerEvent.clientY;
      setDetailPanelHeight(clampDetailPanelHeight(nextHeight));
    }

    function cleanup() {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      resizeCleanupRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
    resizeCleanupRef.current = cleanup;
  }

  return {
    detailPanelHeight,
    handleDetailPanelResizeKeyDown,
    isDetailPanelCollapsed,
    setIsDetailPanelCollapsed,
    startDetailPanelResize
  };
}

export function getDetailPanelMaxHeight(): number {
  if (typeof window === "undefined") {
    return DETAIL_PANEL_MIN_HEIGHT;
  }

  return Math.max(DETAIL_PANEL_MIN_HEIGHT, Math.round(window.innerHeight * 0.78));
}

function clampDetailPanelHeight(value: number): number {
  return Math.min(Math.max(value, DETAIL_PANEL_MIN_HEIGHT), getDetailPanelMaxHeight());
}

function getDetailPanelDefaultHeight(): number {
  if (typeof window === "undefined") {
    return DETAIL_PANEL_MIN_HEIGHT;
  }

  return clampDetailPanelHeight(Math.round(window.innerHeight * DETAIL_PANEL_DEFAULT_HEIGHT_RATIO));
}
