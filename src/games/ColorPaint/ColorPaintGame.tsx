import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { colors } from '../../theme/colors';
import GameScreen, { GameStat } from '../../components/GameScreen';

const COLS = 20;
const ROWS = 28;

const BG_COLOR = '#FFF0EB';
const PAINT_COLOR = colors.primary;

function createGrid(): boolean[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(false));
}

interface Props {
  onBack: () => void;
}

export default function ColorPaintGame({ onBack }: Props) {
  const [grid, setGrid] = useState<boolean[][]>(createGrid);
  const [painted, setPainted] = useState(0);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const totalCells = COLS * ROWS;
  const progressPercent = Math.round((painted / totalCells) * 100);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const gridRef = useRef<boolean[][]>(createGrid());
  const paintedRef = useRef(0);

  // Cell dimensions measured from actual layout
  const cellWRef = useRef(0);
  const cellHRef = useRef(0);
  const [cellSize, setCellSize] = useState({ w: 0, h: 0 });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = width / COLS;
    const h = height / ROWS;
    cellWRef.current = w;
    cellHRef.current = h;
    setCellSize({ w, h });
  }, []);

  const paintCell = useCallback(
    (px: number, py: number) => {
      const cw = cellWRef.current;
      const ch = cellHRef.current;
      if (cw === 0 || ch === 0) return;

      const col = Math.floor(px / cw);
      const row = Math.floor(py / ch);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
      if (gridRef.current[row][col]) return;

      gridRef.current = gridRef.current.map((r, ri) =>
        ri === row ? r.map((c, ci) => (ci === col ? true : c)) : r
      );
      paintedRef.current += 1;

      const newPercent = paintedRef.current / totalCells;
      Animated.timing(progressAnim, {
        toValue: newPercent,
        duration: 100,
        useNativeDriver: false,
      }).start();

      setGrid(gridRef.current.map((r) => [...r]));
      setPainted(paintedRef.current);

      if (paintedRef.current >= totalCells * 0.98) {
        setWon(true);
      }
    },
    [progressAnim, totalCells]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        paintCell(locationX, locationY);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        paintCell(locationX, locationY);
      },
    })
  ).current;

  const resetGame = useCallback(() => {
    const fresh = createGrid();
    gridRef.current = fresh;
    paintedRef.current = 0;
    setGrid(fresh);
    setPainted(0);
    setWon(false);
    progressAnim.setValue(0);
  }, [progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <GameScreen
      onBack={onBack}
      stats={<GameStat label="Painted" value={`${progressPercent}%`} />}
    >
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>

      {!started ? (
        <View style={styles.startContainer}>
          <Text style={styles.startEmoji}>🎨</Text>
          <Text style={styles.startTitle}>Color Fill</Text>
          <Text style={styles.startSubtitle}>Drag your finger to paint the whole screen!</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStarted(true)}>
            <Text style={styles.primaryBtnText}>Start Painting</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={styles.gameArea}
          onLayout={handleLayout}
          {...panResponder.panHandlers}
        >
          {cellSize.w > 0 && grid.map((row, ri) =>
            row.map((cell, ci) => (
              <View
                key={`${ri}-${ci}`}
                style={[
                  styles.cell,
                  {
                    left: ci * cellSize.w,
                    top: ri * cellSize.h,
                    width: cellSize.w,
                    height: cellSize.h,
                    backgroundColor: cell ? PAINT_COLOR : BG_COLOR,
                  },
                ]}
              />
            ))
          )}

          {won && (
            <View style={styles.wonOverlay}>
              <Text style={styles.wonEmoji}>🎉</Text>
              <Text style={styles.wonTitle}>Amazing!</Text>
              <Text style={styles.wonSubtitle}>You painted the whole screen!</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={resetGame}>
                <Text style={styles.primaryBtnText}>Paint Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: BG_COLOR,
  },
  cell: {
    position: 'absolute',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  startEmoji: { fontSize: 64 },
  startTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  startSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  wonOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  wonEmoji: { fontSize: 64 },
  wonTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  wonSubtitle: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
});
