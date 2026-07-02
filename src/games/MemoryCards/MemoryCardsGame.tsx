import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import GameScreen, { GameStat } from '../../components/GameScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 10;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_MARGIN * (CARDS_PER_ROW * 2)) / CARDS_PER_ROW;
const CARD_HEIGHT = CARD_WIDTH * 1.35;

const CARD_PAIRS = [
  { id: 'flower', emoji: '🌸', label: 'Bloom' },
  { id: 'leaf', emoji: '🌿', label: 'Grow' },
  { id: 'star', emoji: '⭐', label: 'Shine' },
];

interface CardData {
  uid: string;
  pairId: string;
  emoji: string;
  label: string;
  flipAnim: Animated.Value;
  matched: boolean;
}

function createDeck(): CardData[] {
  const deck = [...CARD_PAIRS, ...CARD_PAIRS].map((pair, i) => ({
    uid: `${pair.id}-${i}`,
    pairId: pair.id,
    emoji: pair.emoji,
    label: pair.label,
    flipAnim: new Animated.Value(0),
    matched: false,
  }));
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface Props {
  onBack: () => void;
}

export default function MemoryCardsGame({ onBack }: Props) {
  const [deck, setDeck] = useState<CardData[]>(createDeck);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const flipCard = useCallback(
    (card: CardData) => {
      if (disabled || flipped.includes(card.uid) || card.matched) return;

      const newFlipped = [...flipped, card.uid];
      setFlipped(newFlipped);

      Animated.spring(card.flipAnim, {
        toValue: 1,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();

      if (newFlipped.length === 2) {
        setMoves((m) => m + 1);
        setDisabled(true);

        const [firstId, secondId] = newFlipped;
        const first = deck.find((c) => c.uid === firstId)!;
        const second = deck.find((c) => c.uid === secondId)!;

        if (first.pairId === second.pairId) {
          // Match!
          setTimeout(() => {
            setDeck((prev) => {
              const next = prev.map((c) =>
                c.uid === firstId || c.uid === secondId ? { ...c, matched: true } : c
              );
              if (next.every((c) => c.matched)) setWon(true);
              return next;
            });
            setFlipped([]);
            setDisabled(false);
          }, 600);
        } else {
          // No match — flip back
          setTimeout(() => {
            Animated.spring(first.flipAnim, {
              toValue: 0,
              friction: 8,
              tension: 10,
              useNativeDriver: true,
            }).start();
            Animated.spring(second.flipAnim, {
              toValue: 0,
              friction: 8,
              tension: 10,
              useNativeDriver: true,
            }).start();
            setFlipped([]);
            setDisabled(false);
          }, 900);
        }
      }
    },
    [deck, flipped, disabled]
  );

  const resetGame = useCallback(() => {
    setDeck(createDeck());
    setFlipped([]);
    setMoves(0);
    setWon(false);
    setDisabled(false);
  }, []);

  return (
    <GameScreen onBack={onBack} stats={<GameStat label="Moves" value={moves} />}>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Memory</Text>
            <Text style={styles.subtitle}>Find all 3 matching pairs</Text>
          </View>
          <View style={styles.movesBox}>
            <Text style={styles.movesValue}>{moves}</Text>
            <Text style={styles.movesLabel}>moves</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {deck.map((card) => {
            const frontRotate = card.flipAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg'],
            });
            const backRotate = card.flipAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['180deg', '360deg'],
            });
            const frontOpacity = card.flipAnim.interpolate({
              inputRange: [0.5, 0.51],
              outputRange: [0, 1],
            });
            const backOpacity = card.flipAnim.interpolate({
              inputRange: [0.49, 0.5],
              outputRange: [1, 0],
            });

            return (
              <TouchableOpacity
                key={card.uid}
                onPress={() => flipCard(card)}
                activeOpacity={0.9}
                style={styles.cardContainer}
              >
                {/* Card back */}
                <Animated.View
                  style={[
                    styles.card,
                    styles.cardBack,
                    card.matched && styles.cardMatched,
                    { transform: [{ rotateY: backRotate }], opacity: backOpacity },
                  ]}
                >
                  <View style={styles.cardBackPattern}>
                    <Text style={styles.cardBackIcon}>🌱</Text>
                  </View>
                </Animated.View>

                {/* Card front */}
                <Animated.View
                  style={[
                    styles.card,
                    styles.cardFront,
                    card.matched && styles.cardMatched,
                    { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
                  ]}
                >
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                  <Text style={styles.cardLabel}>{card.label}</Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {won && (
          <View style={styles.wonOverlay}>
            <Text style={styles.wonEmoji}>🎉</Text>
            <Text style={styles.wonTitle}>You did it!</Text>
            <Text style={styles.wonMoves}>Completed in {moves} moves</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={resetGame}>
              <Text style={styles.primaryBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  movesBox: { alignItems: 'center' },
  movesLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  movesValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: CARD_MARGIN * 2,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backfaceVisibility: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBack: {
    backgroundColor: colors.primary,
  },
  cardFront: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryLighter,
  },
  cardMatched: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  cardBackPattern: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackIcon: {
    fontSize: 26,
  },
  cardEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  wonOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.97)',
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
  wonMoves: {
    fontSize: 16,
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
