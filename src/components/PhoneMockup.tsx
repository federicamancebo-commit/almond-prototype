import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const PHONE_W = 414;
const PHONE_H = 892;
const SHELL_W = PHONE_W + 12;
const SHELL_H = PHONE_H + 24;

interface Props {
  children: React.ReactNode;
}

function useScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padding = 48;
      const scaleH = (vh - padding) / SHELL_H;
      const scaleW = (vw - padding) / SHELL_W;
      setScale(Math.min(scaleH, scaleW, 1));
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return scale;
}

export default function PhoneMockup({ children }: Props) {
  const scale = useScale();

  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={styles.desktop}>
      <View
        style={[
          styles.phoneShell,
          {
            transform: [{ scale }],
          },
        ]}
      >
        {/* Side buttons */}
        <View style={[styles.sideBtn, styles.volumeUp]} />
        <View style={[styles.sideBtn, styles.volumeDown]} />
        <View style={[styles.sideBtn, styles.power]} />

        {/* Screen bezel */}
        <View style={styles.bezel}>
          {/* Dynamic island */}
          <View style={styles.dynamicIsland} />

          {/* Screen content */}
          <View style={styles.screen}>{children}</View>

          {/* Home indicator */}
          <View style={styles.homeIndicatorBar}>
            <View style={styles.homeIndicator} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({ width: '100vw', height: '100vh', overflow: 'hidden' } as any)
      : {}),
  },
  phoneShell: {
    width: SHELL_W,
    height: SHELL_H,
    backgroundColor: '#1C1C1E',
    borderRadius: 52,
    position: 'relative',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow:
            '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.04)',
          flexShrink: 0,
        } as any)
      : {}),
  },
  sideBtn: {
    position: 'absolute',
    backgroundColor: '#3A3A3C',
    borderRadius: 3,
  },
  volumeUp: {
    left: -5,
    top: 150,
    width: 5,
    height: 38,
  },
  volumeDown: {
    left: -5,
    top: 205,
    width: 5,
    height: 38,
  },
  power: {
    right: -5,
    top: 178,
    width: 5,
    height: 60,
  },
  bezel: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 46,
    margin: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  dynamicIsland: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    width: 126,
    height: 36,
    backgroundColor: '#000',
    borderRadius: 22,
    zIndex: 10,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 0 2px #1C1C1E' } as any)
      : {}),
  },
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    overflow: 'hidden',
  },
  homeIndicatorBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
});
