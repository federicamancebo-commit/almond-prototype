import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';

const _popAudio = typeof Audio !== 'undefined' ? new Audio('/balloon-pop.mp3') : null;

function playPopSound() {
  if (Platform.OS !== 'web' || !_popAudio) return;
  try {
    const snd = _popAudio.cloneNode() as HTMLAudioElement;
    snd.volume = 1.0;
    snd.play().catch(() => {});
  } catch (_) {}
}

const COLORS = [
  '#FF5C35', '#FF8C6A', '#FFC947', '#FF3B00',
  '#FF6B8A', '#9B59B6', '#3498DB', '#2ECC71',
  '#E74C3C', '#F39C12',
];

interface BalloonData {
  id: number;
  xPct: number;
  color: string;
  duration: number;
  size: number;
}

let _uid = 0;

function BalloonItem({
  data,
  containerWidth,
  containerHeight,
  onPop,
  onMiss,
}: {
  data: BalloonData;
  containerWidth: number;
  containerHeight: number;
  onPop: (id: number) => void;
  onMiss: (id: number) => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const poppedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (containerHeight === 0 || startedRef.current) return;
    startedRef.current = true;
    const travel = containerHeight + data.size + 60;
    Animated.timing(translateY, {
      toValue: -travel,
      duration: data.duration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !poppedRef.current) onMiss(data.id);
    });
  }, [containerHeight]);

  const pop = () => {
    if (poppedRef.current) return;
    poppedRef.current = true;
    playPopSound();
    translateY.stopAnimation();
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 60, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onPop(data.id));
  };

  const leftPx = (data.xPct / 100) * containerWidth - data.size / 2;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -(data.size + 26),
        left: leftPx,
        width: data.size,
        transform: [{ translateY }, { scale }],
        opacity,
        alignItems: 'center',
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={pop}
        style={[
          bs.body,
          {
            width: data.size,
            height: data.size,
            borderRadius: data.size / 2,
            backgroundColor: data.color,
          },
        ]}
      >
        {/* Highlight glare */}
        <View
          style={{
            position: 'absolute',
            top: data.size * 0.12,
            left: data.size * 0.18,
            width: data.size * 0.28,
            height: data.size * 0.22,
            borderRadius: data.size * 0.14,
            backgroundColor: 'rgba(255,255,255,0.35)',
            transform: [{ rotate: '-30deg' }],
          }}
        />
      </TouchableOpacity>
      {/* Knot */}
      <View style={[bs.knot, { backgroundColor: data.color }]} />
      {/* String */}
      <View style={bs.string} />

    </Animated.View>
  );
}

export default function BalloonsGame({ onScoreChange }: { onScoreChange?: (n: number) => void }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [balloons, setBalloons] = useState<BalloonData[]>([]);
  const [popped, setPopped] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBalloons(prev => {
        if (prev.length >= 15) return prev;
        const s = 52 + Math.floor(Math.random() * 30);
        return [
          ...prev,
          {
            id: _uid++,
            xPct: 8 + Math.random() * 84,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            duration: 3600 + Math.random() * 4200,
            size: s,
          },
        ];
      });
    }, 1050);
    return () => clearInterval(interval);
  }, []);

  const remove = useCallback((id: number) => {
    setBalloons(prev => prev.filter(b => b.id !== id));
  }, []);

  const handlePop = useCallback(
    (id: number) => {
      setPopped(n => {
        const next = n + 1;
        onScoreChange?.(next);
        return next;
      });
      remove(id);
    },
    [remove, onScoreChange],
  );

  const handleMiss = useCallback(
    (id: number) => {
      remove(id);
    },
    [remove],
  );

  return (
    <View
      style={bs.root}
      onLayout={e =>
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      {size.h > 0 &&
        balloons.map(b => (
          <BalloonItem
            key={b.id}
            data={b}
            containerWidth={size.w}
            containerHeight={size.h}
            onPop={handlePop}
            onMiss={handleMiss}
          />
        ))}
    </View>
  );
}

const bs = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  body: {
    overflow: 'hidden',
  },
  knot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: -3,
  },
  string: {
    width: 1.5,
    height: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
