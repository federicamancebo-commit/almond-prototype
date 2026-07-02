import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

const COLS = 6;
const GAP = 7;

function BubbleCell({
  size,
  popped,
  isDragging,
  onPop,
}: {
  size: number;
  popped: boolean;
  isDragging: React.MutableRefObject<boolean>;
  onPop: () => void;
}) {
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const popProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (popped) {
      Animated.timing(popProgress, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [popped]);

  const triggerPop = () => {
    if (popped) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.72, duration: 40, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0,  duration: 60, useNativeDriver: true }),
    ]).start(onPop);
  };

  const webHandlers = Platform.OS === 'web' ? {
    onMouseDown: (e: any) => { e.preventDefault(); isDragging.current = true; triggerPop(); },
    onMouseEnter: () => { if (isDragging.current) triggerPop(); },
  } : {};

  const r = size / 2;
  const inflatedOpacity = popProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const poppedOpacity   = popProgress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  return (
    <Animated.View
      {...(webHandlers as any)}
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 0.75,
          overflow: 'hidden',
          backgroundColor: 'transparent',
          borderColor: '#5BA4CC',
          cursor: popped ? 'default' : 'pointer',
        } as any,
        !popped && bw.bubbleShadow,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Inflated layer — fades out on pop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#B8DDEF', opacity: inflatedOpacity }]}>
        <View style={{
          position: 'absolute',
          width: size * 0.6, height: size * 0.52,
          borderRadius: size * 0.26,
          top: size * 0.1, left: size * 0.2,
          backgroundColor: 'rgba(255,255,255,0.52)',
        }} />
        <View style={{
          position: 'absolute',
          width: size * 0.2, height: size * 0.16,
          borderRadius: size * 0.08,
          top: size * 0.11, left: size * 0.13,
          backgroundColor: 'rgba(255,255,255,0.92)',
        }} />
      </Animated.View>

      {/* Popped layer — fades in after squeeze */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(106,159,184,0.45)', opacity: poppedOpacity }]}>
        <View style={{
          position: 'absolute',
          width: size * 0.5, height: size * 0.18,
          borderRadius: size * 0.09,
          top: size * 0.18, left: size * 0.22,
          backgroundColor: 'rgba(255,255,255,0.30)',
          transform: [{ rotate: '25deg' }],
        }} />
        <View style={{
          position: 'absolute',
          width: size * 0.28, height: size * 0.10,
          borderRadius: size * 0.05,
          top: size * 0.55, left: size * 0.48,
          backgroundColor: 'rgba(255,255,255,0.22)',
          transform: [{ rotate: '-20deg' }],
        }} />
        <View style={{
          position: 'absolute',
          width: size * 0.12, height: size * 0.10,
          borderRadius: size * 0.05,
          top: size * 0.14, left: size * 0.16,
          backgroundColor: 'rgba(255,255,255,0.55)',
          transform: [{ rotate: '10deg' }],
        }} />
      </Animated.View>
    </Animated.View>
  );
}

export default function BubbleWrap({
  onScoreChange,
}: {
  onScoreChange?: (n: number) => void;
}) {
  const [size, setSize] = useState(0);
  const [bubbles, setBubbles] = useState<boolean[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const scoreRef = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const stop = () => { isDragging.current = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  const handleLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    const HPAD = 16;
    const VTOP = 12;
    const s = Math.floor((width - GAP * (COLS - 1) - HPAD * 2) / COLS);
    const rows = Math.max(1, Math.floor((height - VTOP + GAP) / (s + GAP)) - 1);
    setSize(s);
    setBubbles(Array(COLS * rows).fill(false));
    scoreRef.current = 0;
  }, []);

  const pop = useCallback(
    (idx: number) => {
      setBubbles(prev => {
        if (prev[idx]) return prev;
        const next = [...prev];
        next[idx] = true;
        scoreRef.current += 1;
        onScoreChange?.(scoreRef.current);
        if (next.every(b => b)) {
          setTimeout(() => {
            scoreRef.current = 0;
            setResetKey(k => k + 1);
            setBubbles(Array(next.length).fill(false));
          }, 600);
        }
        return next;
      });
    },
    [onScoreChange],
  );

  return (
    <View style={bw.root} onLayout={handleLayout}>
      {size > 0 && (
        <View style={[bw.grid, { gap: GAP }]}>
          {bubbles.map((popped, i) => (
            <BubbleCell
              key={`${resetKey}-${i}`}
              size={size}
              popped={popped}
              isDragging={isDragging}
              onPop={() => pop(i)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const bw = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bubbleShadow: {
    shadowColor: '#2A618A',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
});
