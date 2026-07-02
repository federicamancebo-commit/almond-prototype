import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AlmondLogo from './AlmondLogo';

const ACCENT = '#FE5F2A';

interface Props {
  onBack?: () => void;
  stats?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children: React.ReactNode;
}

export default function GameScreen({ onBack, stats, secondaryAction, children }: Props) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Logo row */}
      <View style={s.logoRow}>
        <AlmondLogo height={20} />
      </View>

      {/* Back row — hidden when no onBack */}
      {onBack != null && (
        <View style={s.subRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          >
            <Svg width={10} height={18} viewBox="0 0 10 18" fill="none">
              <Path
                d="M9 1L1 9L9 17"
                stroke={ACCENT}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats row — centered below Back */}
      {stats != null && <View style={s.statsRow}>{stats}</View>}

      {/* Game content */}
      <View style={s.content}>{children}</View>

      {/* Bottom CTA */}
      <View style={s.footer}>
        {secondaryAction != null && (
          <View style={s.secondaryWrap}>{secondaryAction}</View>
        )}
        <TouchableOpacity style={s.feelBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={s.feelText}>I'm feeling better</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export function GameStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={stat.wrap}>
      <Text style={stat.label}>{label}</Text>
      <Text style={stat.value}>{value}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  label: { fontSize: 15, color: '#1A1A1A' },
  value: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  logoRow: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginTop: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
    color: ACCENT,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 24,
    paddingVertical: 10,
  },

  content: { flex: 1 },

  footer: {
    paddingHorizontal: 65,
    paddingTop: 16,
    paddingBottom: 30,
  },
  secondaryWrap: {
    marginBottom: 12,
  },
  feelBtn: {
    backgroundColor: ACCENT,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feelText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
