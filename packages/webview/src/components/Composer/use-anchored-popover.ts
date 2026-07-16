import type { CSSProperties, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

export interface AnchoredPopover {
  popoverStyle: CSSProperties;
  triggerRef: RefObject<HTMLButtonElement>;
}

const MAX_POPOVER_WIDTH = 240;
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;

export function useAnchoredPopover(open: boolean): AnchoredPopover {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({
    bottom: VIEWPORT_MARGIN,
    left: VIEWPORT_MARGIN,
    width: MAX_POPOVER_WIDTH,
  });

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;

    const update = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const documentRect = document.documentElement.getBoundingClientRect();
      const viewportLeft = Math.max(0, documentRect.left);
      const viewportRight = Math.min(window.innerWidth, documentRect.right || window.innerWidth);
      const width = Math.min(
        MAX_POPOVER_WIDTH,
        Math.max(0, viewportRight - viewportLeft - VIEWPORT_MARGIN * 2),
      );
      const left = Math.min(
        Math.max(triggerRect.right - width, viewportLeft + VIEWPORT_MARGIN),
        viewportRight - width - VIEWPORT_MARGIN,
      );
      setPopoverStyle({
        bottom: Math.max(VIEWPORT_MARGIN, window.innerHeight - triggerRect.top + TRIGGER_GAP),
        left,
        width,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    observer.observe(trigger);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  return { popoverStyle, triggerRef };
}
