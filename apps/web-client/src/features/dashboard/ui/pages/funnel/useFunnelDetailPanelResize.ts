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

export function useFunnelDetailPanelResize(bottomOffset = 0) {
  const [detailPanelHeight, setDetailPanelHeight] = useState(() =>
    getDetailPanelDefaultHeight(bottomOffset)
  );
  const [isDetailPanelCollapsed, setIsDetailPanelCollapsed] = useState(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      resizeCleanupRef.current?.();
    },
    []
  );

  useEffect(() => {
    setDetailPanelHeight((current) => clampDetailPanelHeight(current, bottomOffset));
  }, [bottomOffset]);

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
      setDetailPanelHeight(
        Math.min(DETAIL_PANEL_MIN_HEIGHT, getDetailPanelMaxHeight(bottomOffset))
      );
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setIsDetailPanelCollapsed(false);
      setDetailPanelHeight(getDetailPanelMaxHeight(bottomOffset));
    }
  }

  function resizeDetailPanelBy(delta: number) {
    setIsDetailPanelCollapsed(false);
    setDetailPanelHeight((current) => clampDetailPanelHeight(current + delta, bottomOffset));
  }

  function startDetailPanelResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDetailPanelCollapsed(false);
    resizeCleanupRef.current?.();

    const startY = event.clientY;
    const startHeight = isDetailPanelCollapsed
      ? Math.max(detailPanelHeight, getDetailPanelDefaultHeight(bottomOffset))
      : detailPanelHeight;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";

    function handlePointerMove(pointerEvent: PointerEvent) {
      const nextHeight = startHeight + startY - pointerEvent.clientY;
      setDetailPanelHeight(clampDetailPanelHeight(nextHeight, bottomOffset));
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
    detailPanelMaxHeight: getDetailPanelMaxHeight(bottomOffset),
    handleDetailPanelResizeKeyDown,
    isDetailPanelCollapsed,
    setIsDetailPanelCollapsed,
    startDetailPanelResize
  };
}

export function getDetailPanelMaxHeight(bottomOffset = 0): number {
  if (typeof window === "undefined") {
    return DETAIL_PANEL_MIN_HEIGHT;
  }

  const responsiveBottomOffset = window.matchMedia("(max-width: 767px)").matches ? bottomOffset : 0;

  return calculateDetailPanelMaxHeight(window.innerHeight, responsiveBottomOffset);
}

export function calculateDetailPanelMaxHeight(viewportHeight: number, bottomOffset = 0): number {
  return Math.max(
    DETAIL_PANEL_COLLAPSED_HEIGHT,
    Math.round(viewportHeight * 0.78) - Math.max(0, bottomOffset)
  );
}

function clampDetailPanelHeight(value: number, bottomOffset: number): number {
  const maxHeight = getDetailPanelMaxHeight(bottomOffset);
  const minHeight = Math.min(DETAIL_PANEL_MIN_HEIGHT, maxHeight);

  return Math.min(Math.max(value, minHeight), maxHeight);
}

function getDetailPanelDefaultHeight(bottomOffset: number): number {
  if (typeof window === "undefined") {
    return DETAIL_PANEL_MIN_HEIGHT;
  }

  return clampDetailPanelHeight(
    Math.round(window.innerHeight * DETAIL_PANEL_DEFAULT_HEIGHT_RATIO),
    bottomOffset
  );
}
