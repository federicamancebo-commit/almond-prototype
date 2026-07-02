import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import AlmondLogo from '../components/AlmondLogo';
import { createFluid, FluidHandle, RGB, ThemeConfig } from './fluid';

// ── Themes ─────────────────────────────────────────────────────────────────

interface Theme extends ThemeConfig {
  label: string;
  icon: string;
  particles: string[];
}

const THEMES: Record<string, Theme> = {
  default: {
    label: 'Default',
    icon: '✦',
    bg:     [0.05, 0.02, 0.01],
    colors: [[1.0, 0.37, 0.16], [1.0, 0.55, 0.0], [0.9, 0.2, 0.05]],
    particles: [],
    velDiss: 0.98, densDiss: 0.996,
  },
  spring: {
    label: 'Spring',
    icon: '🌸',
    bg:     [0.0, 0.07, 0.04],
    colors: [[0.0, 0.66, 0.27], [1.0, 0.42, 0.61], [1.0, 0.85, 0.0]],
    particles: ['🌸', '🌺', '🌼', '🌱', '🌸', '🌼'],
    velDiss: 0.97, densDiss: 0.995,
  },
  summer: {
    label: 'Summer',
    icon: '☀️',
    bg:     [0.0, 0.04, 0.1],
    colors: [[1.0, 0.55, 0.0], [1.0, 0.85, 0.0], [0.0, 0.78, 0.84]],
    particles: ['☀️', '🌊', '⭐', '🌊', '☀️'],
    velDiss: 0.98, densDiss: 0.997,
  },
  fall: {
    label: 'Fall',
    icon: '🍂',
    bg:     [0.04, 0.02, 0.0],
    colors: [
      [0.55, 0.18, 0.0],
      [0.77, 0.30, 0.0],
      [0.91, 0.45, 0.1],
      [0.29, 0.22, 0.0],
      [0.65, 0.25, 0.0],
    ],
    particles: ['🍂', '🍁', '🍃', '🍂', '🍁', '🍃', '🍂', '🍁'],
    velDiss: 0.98, densDiss: 0.997,
  },
  winter: {
    label: 'Winter',
    icon: '❄️',
    bg:     [0.03, 0.0, 0.1],
    colors: [
      [0.16, 0.0, 0.43],
      [0.4,  0.0, 0.8],
      [1.0,  0.27, 0.0],
      [0.0,  0.27, 0.67],
    ],
    particles: ['❄️', '✦', '✧', '❄️', '✦', '❄️', '✧', '✦', '❄️'],
    velDiss: 0.97, densDiss: 0.994,
  },
  balloons: {
    label: 'Balloons',
    icon: '🎈',
    bg:     [0.0, 0.0, 0.05],
    colors: [[1.0, 0.2, 0.2], [0.2, 0.8, 1.0], [1.0, 0.9, 0.0], [0.8, 0.2, 1.0]],
    particles: ['🎈', '🎉', '✨', '🎈', '✨', '🎉'],
    velDiss: 0.98, densDiss: 0.996,
  },
  sand: {
    label: 'Sand',
    icon: '🏖️',
    bg:     [0.08, 0.05, 0.01],
    colors: [[0.76, 0.58, 0.2], [0.9, 0.72, 0.35], [0.55, 0.35, 0.1]],
    particles: ['🐚', '⭐', '🌊', '🐚', '⭐'],
    velDiss: 0.99, densDiss: 0.998,
  },
};

const THEME_ORDER = ['default', 'spring', 'summer', 'fall', 'winter', 'balloons', 'sand'];

// ── Particles ──────────────────────────────────────────────────────────────

interface Particle { id: number; emoji: string; x: number; y: number; size: number; opacity: number }

function makeParticles(theme: Theme): Particle[] {
  return theme.particles.map((emoji, i) => ({
    id: i,
    emoji,
    x: 5 + Math.random() * 90,
    y: 5 + Math.random() * 85,
    size: 14 + Math.random() * 18,
    opacity: 0.5 + Math.random() * 0.5,
  }));
}

// ── Timer ──────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function CalmModeScreen() {
  const [themeKey, setThemeKey] = useState('fall');
  const [seconds, setSeconds] = useState(0);
  const [particles, setParticles] = useState<Particle[]>(() => makeParticles(THEMES.fall));

  const containerRef   = useRef<any>(null);
  const fluidRef       = useRef<FluidHandle | null>(null);
  const themeRef       = useRef<Theme>(THEMES.fall);
  const colorIdxRef    = useRef(0);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Setup WebGL once
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block',
    } as CSSStyleDeclaration);
    container.appendChild(canvas);

    const fluid = createFluid(canvas, themeRef.current);
    fluidRef.current = fluid;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x   = (e.clientX - rect.left)  / rect.width;
      const y   = 1.0 - (e.clientY - rect.top) / rect.height;
      const dx  =  e.movementX / rect.width;
      const dy  = -e.movementY / rect.height;
      const colors = themeRef.current.colors;
      const color = colors[colorIdxRef.current++ % colors.length];
      fluid?.splat(x, y, dx, dy, color as RGB);
    };
    canvas.addEventListener('mousemove', onMove);

    // Periodic ambient splat to keep the simulation alive
    const ambientId = setInterval(() => {
      const colors = themeRef.current.colors;
      const color = colors[Math.floor(Math.random() * colors.length)];
      fluid?.ambientSplat(color as RGB);
    }, 1800);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      clearInterval(ambientId);
      fluid?.destroy();
      canvas.remove();
      fluidRef.current = null;
    };
  }, []);

  // Sync theme changes to fluid
  const switchTheme = useCallback((key: string) => {
    const t = THEMES[key];
    themeRef.current = t;
    colorIdxRef.current = 0;
    setThemeKey(key);
    setParticles(makeParticles(t));
    fluidRef.current?.setTheme(t);
  }, []);

  const theme = THEMES[themeKey];

  return (
    <View style={s.root}>
      {/* WebGL canvas container */}
      <View ref={containerRef} style={StyleSheet.absoluteFill} />

      {/* Floating particles */}
      {particles.map(p => (
        <Text
          key={p.id}
          style={[s.particle, { left: `${p.x}%` as any, top: `${p.y}%` as any, fontSize: p.size, opacity: p.opacity }]}
        >
          {p.emoji}
        </Text>
      ))}

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.logoRow}>
          <AlmondLogo height={22} color="#fff" />
          <View style={s.calmBadge}>
            <Text style={s.calmBadgeText}>CALM MODE</Text>
          </View>
        </View>
        <Text style={s.timer}>{fmt(seconds)}</Text>
      </View>

      {/* Theme pills */}
      <View style={s.pills}>
        {THEME_ORDER.map(key => {
          const t = THEMES[key];
          const active = key === themeKey;
          return (
            <TouchableOpacity
              key={key}
              style={[s.pill, active && s.pillActive]}
              onPress={() => switchTheme(key)}
              activeOpacity={0.75}
            >
              <Text style={s.pillIcon}>{t.icon}</Text>
              <Text style={[s.pillLabel, active && s.pillLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Center watermark */}
      <View style={s.watermark} pointerEvents="none">
        <AlmondLogo height={36} color="#ffffff" />
        <Text style={s.watermarkSub}>digital health</Text>
      </View>

      {/* Bottom overlay */}
      <View style={s.bottom}>
        <Text style={s.message}>Notice the colors. Notice your breath.</Text>
        <Text style={s.subMessage}>You're in control.</Text>
        <View style={s.btnRow}>
          <TouchableOpacity style={s.btnPrimary} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>I'm feeling better</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} activeOpacity={0.75}>
            <Text style={s.btnSecondaryText}>Keep playing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    ...(Platform.OS === 'web' ? ({ width: '100vw', height: '100vh', overflow: 'hidden' } as any) : {}),
  },

  particle: {
    position: 'absolute',
    pointerEvents: 'none' as any,
    userSelect: 'none' as any,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calmBadge: {
    backgroundColor: 'rgba(254, 95, 42, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  calmBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timer: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'] as any,
  },

  pills: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillActive: {
    backgroundColor: 'rgba(254, 95, 42, 0.9)',
    borderColor: 'transparent',
  },
  pillIcon: { fontSize: 13 },
  pillLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  pillLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },

  watermark: {
    position: 'absolute',
    top: '50%' as any,
    left: '50%' as any,
    transform: [{ translateX: -60 }, { translateY: -28 }],
    alignItems: 'center',
    opacity: 0.12,
  },
  watermarkSub: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 4,
  },

  bottom: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  message: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
  },
  subMessage: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#FE5F2A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnSecondaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
