import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createFluid, FluidHandle, RGB } from '../screens/fluid';

const THEME = {
  bg:       [1.0, 1.0, 1.0] as RGB,
  colors: [
    [1.0,  0.80, 0.30],
    [1.0,  0.60, 0.10],
    [1.0,  0.45, 0.05],
    [0.85, 0.30, 0.02],
    [1.0,  0.70, 0.20],
  ] as RGB[],
  velDiss:   0.2,   // Pavel scale: decay = 1/(1 + velDiss * dt)
  densDiss:  1.0,
  vorticity: 30,
};

export default function FluidBackground() {
  const containerRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block',
    } as CSSStyleDeclaration);
    container.appendChild(canvas);

    // Set size before first WebGL frame so the viewport isn't 0×0
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round((container.clientWidth  || 414) * dpr);
    canvas.height = Math.round((container.clientHeight || 880) * dpr);

    const fluid = createFluid(canvas, THEME);
    const fluidRef: { current: FluidHandle | null } = { current: fluid };
    let colorIdx = 0;

    const getColor = (): RGB => {
      const c = THEME.colors[colorIdx++ % THEME.colors.length];
      return [c[0] * 0.25, c[1] * 0.25, c[2] * 0.25];
    };

    // Listen on window so React Native Views don't swallow the events
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return;
      const x  = (e.clientX - rect.left) / rect.width;
      const y  = 1.0 - (e.clientY - rect.top) / rect.height;
      const dx =  e.movementX / rect.width;
      const dy = -e.movementY / rect.height;
      fluidRef.current?.splat(x, y, dx, dy, getColor());
    };

    let lastTouch: { x: number; y: number } | null = null;
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      if (t.clientX < rect.left || t.clientX > rect.right ||
          t.clientY < rect.top  || t.clientY > rect.bottom) return;
      e.preventDefault();
      const x  = (t.clientX - rect.left) / rect.width;
      const y  = 1.0 - (t.clientY - rect.top) / rect.height;
      const dx = lastTouch ? (t.clientX - lastTouch.x) / rect.width   : 0;
      const dy = lastTouch ? -(t.clientY - lastTouch.y) / rect.height  : 0;
      lastTouch = { x: t.clientX, y: t.clientY };
      fluidRef.current?.splat(x, y, dx, dy, getColor());
    };
    const onTouchEnd = () => { lastTouch = null; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // Ambient splats keep the fluid alive — use very dim colors to avoid flooding
    const dimColor = (): RGB => {
      const c = getColor();
      return [c[0] * 0.12, c[1] * 0.12, c[2] * 0.12];
    };
    const ambientId = setInterval(() => {
      fluidRef.current?.ambientSplat(dimColor());
    }, 1800);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      clearInterval(ambientId);
      fluid?.destroy();
      canvas.remove();
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  return <View ref={containerRef} style={StyleSheet.absoluteFill} />;
}
