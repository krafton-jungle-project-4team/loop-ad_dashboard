import { useEffect, type RefObject } from "react";

const MAX_OFFSET_PX = 12;
const SCROLL_RESPONSE = 0.18;
const SPRING_DAMPING = 0.7;
const SPRING_STIFFNESS = 0.16;
const SETTLED_THRESHOLD = 0.05;

export function useSoftStickyMotion(
  stickyRef: RefObject<HTMLElement | null>,
  surfaceRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const sticky = stickyRef.current;
    const surface = surfaceRef.current;
    if (!sticky || !surface) {
      return;
    }

    const motionPreference = window.matchMedia(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)"
    );
    const scrollContainer = findScrollContainer(sticky);
    let frameId: number | null = null;
    let isListening = false;
    let offset = 0;
    let previousScrollTop = scrollContainer.scrollTop;
    let velocity = 0;

    const clearMotionStyles = () => {
      surface.style.removeProperty("transform");
      surface.style.removeProperty("will-change");
    };

    const stopAnimation = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const settle = () => {
      velocity = (velocity - offset * SPRING_STIFFNESS) * SPRING_DAMPING;
      offset += velocity;

      if (Math.abs(offset) < SETTLED_THRESHOLD && Math.abs(velocity) < SETTLED_THRESHOLD) {
        offset = 0;
        velocity = 0;
        frameId = null;
        clearMotionStyles();
        return;
      }

      surface.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      frameId = requestAnimationFrame(settle);
    };

    const startSettling = () => {
      if (frameId === null) {
        surface.style.willChange = "transform";
        frameId = requestAnimationFrame(settle);
      }
    };

    const handleScroll = () => {
      const nextScrollTop = scrollContainer.scrollTop;
      const delta = nextScrollTop - previousScrollTop;
      previousScrollTop = nextScrollTop;

      if (!isPinned(sticky, scrollContainer) || delta === 0) {
        return;
      }

      offset = clamp(offset - delta * SCROLL_RESPONSE, -MAX_OFFSET_PX, MAX_OFFSET_PX);
      surface.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      startSettling();
    };

    const syncMotionPreference = () => {
      if (motionPreference.matches && !isListening) {
        previousScrollTop = scrollContainer.scrollTop;
        scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
        isListening = true;
        return;
      }

      if (!motionPreference.matches && isListening) {
        scrollContainer.removeEventListener("scroll", handleScroll);
        isListening = false;
        offset = 0;
        velocity = 0;
        stopAnimation();
        clearMotionStyles();
      }
    };

    motionPreference.addEventListener("change", syncMotionPreference);
    syncMotionPreference();

    return () => {
      motionPreference.removeEventListener("change", syncMotionPreference);
      if (isListening) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
      stopAnimation();
      clearMotionStyles();
    };
  }, [stickyRef, surfaceRef]);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function findScrollContainer(element: HTMLElement): HTMLElement {
  let ancestor = element.parentElement;

  while (ancestor) {
    const overflowY = getComputedStyle(ancestor).overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      ancestor.scrollHeight > ancestor.clientHeight
    ) {
      return ancestor;
    }
    ancestor = ancestor.parentElement;
  }

  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : document.documentElement;
}

function isPinned(sticky: HTMLElement, scrollContainer: HTMLElement) {
  const stickyTop = Number.parseFloat(getComputedStyle(sticky).top) || 0;
  const containerTop =
    scrollContainer === document.documentElement ? 0 : scrollContainer.getBoundingClientRect().top;

  return sticky.getBoundingClientRect().top <= containerTop + stickyTop + 1;
}
