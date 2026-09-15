"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measures a container's width with a ResizeObserver. Replacement for
 * react-grid-layout's WidthProvider, which relies on ReactDOM.findDOMNode —
 * removed in React 19, so the grid would collapse. Pass the returned width to
 * <Responsive width={width} />.
 */
export function useContainerWidth(initial = 1200) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
