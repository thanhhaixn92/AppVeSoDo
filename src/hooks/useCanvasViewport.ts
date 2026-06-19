import { useState, useCallback, useRef } from 'react';

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export function useCanvasViewport() {
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.2, 5) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport(v => ({ ...v, zoom: Math.max(v.zoom / 1.2, 0.2) }));
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag on middle mouse button, or on background directly
    // If it's left click but on an interactive element inside the canvas, ignore
    if (e.button !== 1 && e.button !== 0) return;
    
    // Check if the target is the background wrapper itself, not an inner SVG node
    const target = e.target as HTMLElement;
    const isBackground = target.hasAttribute('data-viewport-bg');
    if (e.button === 0 && !isBackground) return;

    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    target.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    
    setViewport(v => ({
      ...v,
      x: v.x + dx,
      y: v.y + dy
    }));
    
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      const target = e.target as HTMLElement;
      target.releasePointerCapture(e.pointerId);
    }
  }, []);

  return {
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    resetViewport,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  };
}
