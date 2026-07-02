import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import GameScreen, { GameStat } from '../../components/GameScreen';

const BALLOON_W = 100;
const BALLOON_H = 101;
const nativeDriver = Platform.OS !== 'web';

interface Balloon {
  id: number;
  x: number;
  translateY: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  popped: boolean;
}

let balloonIdCounter = 0;

interface Props {
  onBack: () => void;
}

function BalloonIcon({ red }: { red: boolean }) {
  const bg = red ? '#FF8080' : '#9FD7FF';
  const stroke = red ? '#FF3B3B' : '#40B0FF';
  return (
    <Svg width={BALLOON_W} height={BALLOON_H} viewBox="0 0 159 160" fill="none">
      <Rect x={30} y={29} width={98.8616} height={99.9998} rx={49.4308} fill={bg} />
      <Path
        d="M82.2703 70.8447C82.2703 64.5674 77.6907 60.8174 72.043 60.8174M72.043 98.3177C72.8009 100.212 75.4521 104 79.9976 104C90.2249 104 87.384 97.1813 103.861 97.1813"
        stroke={stroke}
        strokeWidth={2.40965}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M72.0456 90.3639C81.4593 90.3639 89.0912 80.0843 89.0912 70.0433C89.0912 60.0012 81.4593 54 72.0456 54C62.6319 54 55 60.0023 55 70.0433C55 80.0843 62.6319 90.3639 72.0456 90.3639ZM72.0456 90.3639C72.0456 90.3639 70.624 91.3003 68.4933 94.1071C68.3471 94.2996 68.2111 94.4829 68.0853 94.6571C66.8342 96.3867 67.8592 98.1515 69.991 98.2651C71.359 98.3379 72.7299 98.3379 74.0979 98.2651C76.2297 98.1515 77.2547 96.3867 76.0036 94.6571C75.8771 94.4829 75.7411 94.2996 75.5956 94.1071C73.4649 91.3003 72.0456 90.3639 72.0456 90.3639Z"
        stroke={stroke}
        strokeWidth={2.40965}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function BalloonPopGame({ onBack }: Props) {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [poppedIds, setPoppedIds] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const spawnInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Measured game area dimensions — updated by onLayout before first spawn
  const areaSize = useRef({ width: 414, height: 700 });

  const spawnBalloon = useCallback(() => {
    const { width, height } = areaSize.current;
    const id = ++balloonIdCounter;
    const x = Math.random() * (width - BALLOON_W);
    // Start just below the visible bottom edge so balloon appears immediately
    const translateY = new Animated.Value(BALLOON_H);
    const scale = new Animated.Value(1);
    const opacity = new Animated.Value(1);

    const newBalloon: Balloon = { id, x, translateY, scale, opacity, popped: false };
    setBalloons((prev) => [...prev.slice(-12), newBalloon]);

    const duration = 7000 + Math.random() * 3000;
    Animated.timing(translateY, {
      // Exit fully past the top edge
      toValue: -(height + BALLOON_H),
      duration,
      useNativeDriver: nativeDriver,
    }).start(({ finished }) => {
      if (finished) setBalloons((prev) => prev.filter((b) => b.id !== id));
    });
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setElapsed(0);
    setBalloons([]);
    setPoppedIds(new Set());

    if (spawnInterval.current) clearInterval(spawnInterval.current);
    if (timerInterval.current) clearInterval(timerInterval.current);
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);

    timerInterval.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    spawnTimeout.current = setTimeout(() => {
      spawnBalloon();
      spawnInterval.current = setInterval(spawnBalloon, 500);
    }, 1000);
  }, [spawnBalloon]);

  useEffect(() => {
    startGame();
    return () => {
      if (spawnInterval.current) clearInterval(spawnInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    };
  }, []);

  const popBalloon = useCallback((balloon: Balloon) => {
    if (balloon.popped) return;
    balloon.popped = true;
    setScore((s) => s + 1);
    setPoppedIds((prev) => new Set(prev).add(balloon.id));

    Animated.parallel([
      Animated.spring(balloon.scale, { toValue: 1.6, useNativeDriver: nativeDriver, speed: 40 }),
      Animated.timing(balloon.opacity, { toValue: 0, duration: 300, useNativeDriver: nativeDriver }),
    ]).start(() => {
      setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));
      setPoppedIds((prev) => { const s = new Set(prev); s.delete(balloon.id); return s; });
    });
  }, []);

  const stats = (
    <>
      <GameStat label="Time" value={`${elapsed}s`} />
      <GameStat label="Score" value={score} />
    </>
  );

  return (
    <GameScreen onBack={onBack} stats={stats}>
      <Text style={styles.title}>Tap the balloons</Text>
      <View
        style={styles.gameArea}
        onLayout={(e) => {
          areaSize.current = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
        }}
      >
        {balloons.map((balloon) => (
          <Animated.View
            key={balloon.id}
            style={[
              styles.balloonWrapper,
              {
                left: balloon.x,
                transform: [{ translateY: balloon.translateY }, { scale: balloon.scale }],
                opacity: balloon.opacity,
              },
            ]}
          >
            <TouchableOpacity onPress={() => popBalloon(balloon)} activeOpacity={0.9}>
              <BalloonIcon red={poppedIds.has(balloon.id)} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FE5F2A',
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingBottom: 8,
  },
  gameArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  balloonWrapper: {
    position: 'absolute',
    bottom: 0,
  },
});
