import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import GameScreen from '../../components/GameScreen';
import { colors } from '../../theme/colors';

interface Props { onBack?: () => void }

const WHEEL_SIZE = 320;

export default function SpinnerGame({ onBack }: Props) {
  const rotRef = useRef(0);
  const rotAnim = useRef(new Animated.Value(0)).current;
  const prevAngle = useRef<number | null>(null);
  const prevTime = useRef(0);
  const angVel = useRef(0);
  const decayAnim = useRef<Animated.CompositeAnimation | null>(null);

  const getAngle = (x: number, y: number) =>
    Math.atan2(y - WHEEL_SIZE / 2, x - WHEEL_SIZE / 2) * (180 / Math.PI);

  const stopDecay = () => {
    if (decayAnim.current) {
      decayAnim.current.stop();
      decayAnim.current = null;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        stopDecay();
        rotAnim.stopAnimation(val => {
          rotRef.current = val;
          rotAnim.setValue(val);
        });
        angVel.current = 0;
        const { locationX, locationY } = evt.nativeEvent;
        prevAngle.current = getAngle(locationX, locationY);
        prevTime.current = Date.now();
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const angle = getAngle(locationX, locationY);

        if (prevAngle.current !== null) {
          let delta = angle - prevAngle.current;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;

          rotRef.current += delta;
          rotAnim.setValue(rotRef.current);

          const now = Date.now();
          const dt = now - prevTime.current;
          if (dt > 0) angVel.current = delta / dt;
          prevTime.current = now;
        }

        prevAngle.current = angle;
      },

      onPanResponderRelease: () => {
        prevAngle.current = null;
        decayAnim.current = Animated.decay(rotAnim, {
          velocity: angVel.current,
          deceleration: 0.9985,
          useNativeDriver: false,
        });
        decayAnim.current.start(({ finished }) => {
          if (finished) {
            rotAnim.stopAnimation(val => { rotRef.current = val; });
          }
        });
      },
    })
  ).current;

  useEffect(() => () => stopDecay(), []);

  const spin = rotAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  const supporterBtn = (
    <TouchableOpacity style={s.supporterBtn} activeOpacity={0.8}>
      <Svg width={22} height={18} viewBox="0 0 22 18" fill="none">
        <Path
          d="M1 1h20v14a1 1 0 01-1 1H2a1 1 0 01-1-1V1z"
          stroke="#999" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        />
        <Path
          d="M1 1l10 9L21 1"
          stroke="#999" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        />
      </Svg>
      <Text style={s.supporterText}>Send a Message to a Supporter</Text>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
          stroke="#3B9EFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );

  return (
    <GameScreen onBack={onBack} secondaryAction={supporterBtn}>
      <View style={s.container}>
        <Text style={s.subtitle}>Spin the wheel</Text>

        <Animated.View
          style={[s.wheelWrap, { transform: [{ rotate: spin }] }]}
          {...panResponder.panHandlers}
        >
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox="0 0 318 319">
            <G>
              <Path
                d="M129.104 299.429C126.639 296.895 124.081 292.42 121.727 286.766C119.324 280.994 117.153 274.045 115.521 266.799C113.888 259.553 112.794 252.021 112.538 245.085C112.282 238.141 112.866 231.828 114.562 227L114.661 226.722C121.574 207.571 144.173 198.376 165.375 206.311C186.68 214.285 198.339 236.487 191.543 255.838C188.148 265.503 177.869 275.696 165.673 283.854C153.584 291.94 139.729 297.945 129.104 299.429Z"
                fill="#F7F7F7" stroke="#FE9069" strokeWidth={1}
              />
              <Path
                d="M30.4199 238.773C30.4688 235.239 31.8243 230.265 34.1578 224.603C36.54 218.822 39.9191 212.374 43.8881 206.096C47.8571 199.817 52.4097 193.719 57.1332 188.633C61.8618 183.541 66.7388 179.491 71.3527 177.276L71.6193 177.149C90.0489 168.495 112.53 177.974 121.912 198.576C131.339 219.28 123.884 243.223 105.395 252.101C96.1599 256.534 81.6836 256.474 67.2917 253.618C53.0256 250.787 38.9828 245.237 30.4199 238.773Z"
                fill="#F7F7F7" stroke="#FE9069" strokeWidth={1}
              />
              <Path
                d="M3.53027 126.103C6.06393 123.638 10.5393 121.08 16.1934 118.726C21.9653 116.323 28.9143 114.153 36.1602 112.52C43.4061 110.887 50.9377 109.794 57.874 109.538C64.8177 109.281 71.1307 109.865 75.959 111.562L76.2373 111.661C95.3883 118.573 104.583 141.172 96.6484 162.375C88.674 183.68 66.4722 195.339 47.1211 188.543C37.4563 185.147 27.2628 174.868 19.1055 162.672C11.0194 150.583 5.01438 136.729 3.53027 126.103Z"
                fill="#F7F7F7" stroke="#FE9069" strokeWidth={1}
              />
              <Path
                d="M62.8143 35.9112C66.3486 35.96 71.3223 37.3155 76.9848 39.6491C82.7654 42.0312 89.2135 45.4104 95.4918 49.3794C101.77 53.3484 107.869 57.9009 112.955 62.6245C118.046 67.353 122.097 72.23 124.311 76.844L124.438 77.1105C133.092 95.5401 123.614 118.021 103.011 127.403C82.3072 136.83 58.3641 129.375 49.4863 110.886C45.0531 101.651 45.1136 87.1749 47.9692 72.7829C50.8 58.5169 56.3503 44.4741 62.8143 35.9112Z"
                fill="#FFDEC8" stroke="#FE9069" strokeWidth={1}
              />
              <Path
                d="M163.628 4.94398C166.664 6.75343 170.294 10.4141 174.031 15.2663C177.846 20.2196 181.741 26.3701 185.193 32.9465C188.646 39.5229 191.651 46.5149 193.694 53.1486C195.739 59.7893 196.809 66.0383 196.419 71.1412L196.396 71.4356C194.676 91.7231 175.226 106.453 152.693 104.277C130.05 102.088 113.042 83.6607 114.598 63.21C115.376 52.9958 122.667 40.4893 132.336 29.4533C141.92 18.5139 153.748 9.12764 163.628 4.94398Z"
                fill="#FFDEC8" stroke="#FE9069" strokeWidth={1}
              />
              <Path
                d="M263.064 54.9529C263.932 58.3794 263.91 63.5344 263.122 69.6079C262.317 75.8081 260.722 82.9111 258.513 90.0027C256.304 97.0944 253.485 104.164 250.239 110.299C246.989 116.44 243.327 121.615 239.443 124.949L239.218 125.14C223.657 138.269 199.488 134.932 185.093 117.46C170.63 99.9012 171.634 74.8445 187.195 61.4839C194.968 54.8116 208.966 51.1233 223.607 50.1568C238.12 49.1987 253.12 50.9254 263.064 54.9529Z"
                fill="#FE9069" stroke="#FE5F2A" strokeWidth={1}
              />
              <Path
                d="M298.016 160.627C296.206 163.664 292.545 167.293 287.693 171.03C282.74 174.845 276.589 178.74 270.013 182.193C263.437 185.645 256.445 188.651 249.811 190.694C243.17 192.738 236.921 193.808 231.818 193.419L231.524 193.396C211.236 191.675 196.506 172.226 198.683 149.693C200.871 127.049 219.299 110.042 239.749 111.598C249.964 112.376 262.47 119.666 273.506 129.335C284.446 138.92 293.832 150.748 298.016 160.627Z"
                fill="#FE5F2A" stroke="#FE5F2A" strokeWidth={1}
              />
              <Path
                d="M176.256 245.264C162.69 229.463 166.073 204.81 183.808 190.199C201.542 175.591 226.915 176.559 240.482 192.36C254.044 208.159 255.27 248.903 247.003 268.976C232.917 272.806 189.823 261.065 176.259 245.26L176.256 245.264Z"
                fill="#FE5F2A"
              />
            </G>
          </Svg>
        </Animated.View>

      </View>
    </GameScreen>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
    gap: 12,
    paddingHorizontal: 32,
  },
  subtitle: {
    fontSize: 26,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  wheelWrap: {
    marginTop: 48,
  },
  hint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  supporterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    gap: 12,
  },
  supporterText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
});
