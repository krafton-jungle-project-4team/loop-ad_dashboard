import { Badge } from "@loopad/ui/shadcn/badge";
import { ToggleGroup, ToggleGroupItem } from "@loopad/ui/shadcn/toggle-group";
import { cn } from "@loopad/ui/shadcn/utils";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { calculateCreativeHtmlPreviewScale } from "./creativeHtmlPreviewScale.js";

const CREATIVE_PREVIEW_HEIGHT = 720;
const DEFAULT_VIEWPORT_WIDTH = 600;
const VIEWPORT_OPTIONS = [
  { label: "375px", width: 375 },
  { label: "600px", width: 600 },
  { label: "1200px", width: 1200 }
] as const;

type CreativePreviewViewportWidth = (typeof VIEWPORT_OPTIONS)[number]["width"];

export function CreativeHtmlPreview({
  className,
  sanitizedHtml,
  statusLabel,
  title
}: {
  className?: string;
  sanitizedHtml: string;
  statusLabel?: string;
  title: string;
}) {
  const availableWidthRef = useRef<HTMLDivElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [viewportWidth, setViewportWidth] =
    useState<CreativePreviewViewportWidth>(DEFAULT_VIEWPORT_WIDTH);
  const scale = calculateCreativeHtmlPreviewScale(availableWidth, viewportWidth);
  const scaledViewportStyle = {
    height: CREATIVE_PREVIEW_HEIGHT * scale,
    width: viewportWidth * scale
  } satisfies CSSProperties;
  const iframeStyle = {
    height: CREATIVE_PREVIEW_HEIGHT,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: viewportWidth
  } satisfies CSSProperties;

  useEffect(() => {
    const element = availableWidthRef.current;
    if (!element) return;

    const updateAvailableWidth = (width: number) => {
      setAvailableWidth((currentWidth) => (currentWidth === width ? currentWidth : width));
    };

    updateAvailableWidth(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateAvailableWidth(entry.contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const previewStage = previewStageRef.current;
    if (!previewStage) return;
    previewStage.scrollLeft = 0;
    previewStage.scrollTop = 0;
  }, [availableWidth, sanitizedHtml, viewportWidth]);

  return (
    <section
      aria-label="광고 HTML 미리보기"
      className={cn(
        "flex min-h-80 min-w-0 flex-col overflow-hidden rounded-lg border bg-card",
        className
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">HTML 미리보기</h2>
          {statusLabel ? (
            <div aria-live="polite" role="status">
              <Badge variant="secondary">{statusLabel}</Badge>
            </div>
          ) : null}
        </div>
        <ToggleGroup
          aria-label="미리보기 viewport 너비"
          onValueChange={(value) => {
            const nextViewport = VIEWPORT_OPTIONS.find((option) => String(option.width) === value);
            if (nextViewport) setViewportWidth(nextViewport.width);
          }}
          size="sm"
          spacing={0}
          type="single"
          value={String(viewportWidth)}
          variant="outline"
        >
          {VIEWPORT_OPTIONS.map((option) => (
            <ToggleGroupItem
              aria-label={`${option.label} 너비로 미리보기`}
              key={option.width}
              value={String(option.width)}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </header>
      <div
        className="min-h-0 flex-1 overflow-auto bg-muted/40 p-4 [overflow-anchor:none]"
        ref={previewStageRef}
      >
        <div className="min-w-0" ref={availableWidthRef}>
          <div
            className="mx-auto overflow-hidden rounded-md bg-background shadow-sm ring-1 ring-border"
            style={scaledViewportStyle}
          >
            <iframe
              className="block border-0 bg-background"
              referrerPolicy="no-referrer"
              sandbox=""
              srcDoc={sanitizedHtml}
              style={iframeStyle}
              title={title}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
