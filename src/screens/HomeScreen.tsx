import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, PanResponder, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, G, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import AlmondLogo from '../components/AlmondLogo';
import BellIcon from '../components/BellIcon';
import TabBar from '../components/TabBar';
import FluidBackground from '../components/FluidBackground';
import BalloonsGame from '../games/Balloons/BalloonsGame';
import BubbleWrap from '../games/Bubbles/BubbleWrap';

// ─── Status bar ──────────────────────────────────────────────────────────────

function SignalBars({ color = '#1A1A1A' }: { color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {[6, 9, 11, 13].map((h, i) => (
        <View key={i} style={{ width: 3.5, height: h, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  );
}

function WifiIcon({ color = '#1A1A1A' }: { color?: string }) {
  return (
    <View style={{ width: 17, height: 13, alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 5 }}>
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: 4, width: 7, height: 5, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 1.8, borderColor: color, borderBottomWidth: 0, backgroundColor: 'transparent' }} />
      <View style={{ position: 'absolute', bottom: 4, width: 13, height: 8, borderTopLeftRadius: 13, borderTopRightRadius: 13, borderWidth: 1.8, borderColor: color, borderBottomWidth: 0, backgroundColor: 'transparent' }} />
    </View>
  );
}

function BatteryIcon({ color = '#1A1A1A' }: { color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 24, height: 12, borderRadius: 3, borderWidth: 1.5, borderColor: color, padding: 2 }}>
        <View style={{ flex: 1, backgroundColor: color, borderRadius: 1.5 }} />
      </View>
      <View style={{ width: 2, height: 6, backgroundColor: color, borderRadius: 1, marginLeft: 1 }} />
    </View>
  );
}

// ─── Spinner wheel ────────────────────────────────────────────────────────────

const WHEEL_SIZE = 320;

function SpinnerWheel() {
  const rotRef = useRef(0);
  const rotAnim = useRef(new Animated.Value(0)).current;
  const prevAngle = useRef<number | null>(null);
  const prevTime = useRef(0);
  const angVel = useRef(0);
  const decayAnim = useRef<Animated.CompositeAnimation | null>(null);

  const getAngle = (x: number, y: number) =>
    Math.atan2(y - WHEEL_SIZE / 2, x - WHEEL_SIZE / 2) * (180 / Math.PI);

  const stopDecay = () => {
    if (decayAnim.current) { decayAnim.current.stop(); decayAnim.current = null; }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        stopDecay();
        rotAnim.stopAnimation(val => { rotRef.current = val; rotAnim.setValue(val); });
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
          if (finished) rotAnim.stopAnimation(val => { rotRef.current = val; });
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

  return (
    <Animated.View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, transform: [{ rotate: spin }] }} {...panResponder.panHandlers}>
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox="0 0 318 319">
        <G>
          <Path d="M129.104 299.429C126.639 296.895 124.081 292.42 121.727 286.766C119.324 280.994 117.153 274.045 115.521 266.799C113.888 259.553 112.794 252.021 112.538 245.085C112.282 238.141 112.866 231.828 114.562 227L114.661 226.722C121.574 207.571 144.173 198.376 165.375 206.311C186.68 214.285 198.339 236.487 191.543 255.838C188.148 265.503 177.869 275.696 165.673 283.854C153.584 291.94 139.729 297.945 129.104 299.429Z" fill="#F7F7F7" stroke="#FE9069" strokeWidth={1} />
          <Path d="M30.4199 238.773C30.4688 235.239 31.8243 230.265 34.1578 224.603C36.54 218.822 39.9191 212.374 43.8881 206.096C47.8571 199.817 52.4097 193.719 57.1332 188.633C61.8618 183.541 66.7388 179.491 71.3527 177.276L71.6193 177.149C90.0489 168.495 112.53 177.974 121.912 198.576C131.339 219.28 123.884 243.223 105.395 252.101C96.1599 256.534 81.6836 256.474 67.2917 253.618C53.0256 250.787 38.9828 245.237 30.4199 238.773Z" fill="#F7F7F7" stroke="#FE9069" strokeWidth={1} />
          <Path d="M3.53027 126.103C6.06393 123.638 10.5393 121.08 16.1934 118.726C21.9653 116.323 28.9143 114.153 36.1602 112.52C43.4061 110.887 50.9377 109.794 57.874 109.538C64.8177 109.281 71.1307 109.865 75.959 111.562L76.2373 111.661C95.3883 118.573 104.583 141.172 96.6484 162.375C88.674 183.68 66.4722 195.339 47.1211 188.543C37.4563 185.147 27.2628 174.868 19.1055 162.672C11.0194 150.583 5.01438 136.729 3.53027 126.103Z" fill="#F7F7F7" stroke="#FE9069" strokeWidth={1} />
          <Path d="M62.8143 35.9112C66.3486 35.96 71.3223 37.3155 76.9848 39.6491C82.7654 42.0312 89.2135 45.4104 95.4918 49.3794C101.77 53.3484 107.869 57.9009 112.955 62.6245C118.046 67.353 122.097 72.23 124.311 76.844L124.438 77.1105C133.092 95.5401 123.614 118.021 103.011 127.403C82.3072 136.83 58.3641 129.375 49.4863 110.886C45.0531 101.651 45.1136 87.1749 47.9692 72.7829C50.8 58.5169 56.3503 44.4741 62.8143 35.9112Z" fill="#FFDEC8" stroke="#FE9069" strokeWidth={1} />
          <Path d="M163.628 4.94398C166.664 6.75343 170.294 10.4141 174.031 15.2663C177.846 20.2196 181.741 26.3701 185.193 32.9465C188.646 39.5229 191.651 46.5149 193.694 53.1486C195.739 59.7893 196.809 66.0383 196.419 71.1412L196.396 71.4356C194.676 91.7231 175.226 106.453 152.693 104.277C130.05 102.088 113.042 83.6607 114.598 63.21C115.376 52.9958 122.667 40.4893 132.336 29.4533C141.92 18.5139 153.748 9.12764 163.628 4.94398Z" fill="#FFDEC8" stroke="#FE9069" strokeWidth={1} />
          <Path d="M263.064 54.9529C263.932 58.3794 263.91 63.5344 263.122 69.6079C262.317 75.8081 260.722 82.9111 258.513 90.0027C256.304 97.0944 253.485 104.164 250.239 110.299C246.989 116.44 243.327 121.615 239.443 124.949L239.218 125.14C223.657 138.269 199.488 134.932 185.093 117.46C170.63 99.9012 171.634 74.8445 187.195 61.4839C194.968 54.8116 208.966 51.1233 223.607 50.1568C238.12 49.1987 253.12 50.9254 263.064 54.9529Z" fill="#FE9069" stroke="#FE5F2A" strokeWidth={1} />
          <Path d="M298.016 160.627C296.206 163.664 292.545 167.293 287.693 171.03C282.74 174.845 276.589 178.74 270.013 182.193C263.437 185.645 256.445 188.651 249.811 190.694C243.17 192.738 236.921 193.808 231.818 193.419L231.524 193.396C211.236 191.675 196.506 172.226 198.683 149.693C200.871 127.049 219.299 110.042 239.749 111.598C249.964 112.376 262.47 119.666 273.506 129.335C284.446 138.92 293.832 150.748 298.016 160.627Z" fill="#FE5F2A" stroke="#FE5F2A" strokeWidth={1} />
          <Path d="M176.256 245.264C162.69 229.463 166.073 204.81 183.808 190.199C201.542 175.591 226.915 176.559 240.482 192.36C254.044 208.159 255.27 248.903 247.003 268.976C232.917 272.806 189.823 261.065 176.259 245.26L176.256 245.264Z" fill="#FE5F2A" />
        </G>
      </Svg>
    </Animated.View>
  );
}

// ─── Bottom tab icons (from floating component SVG) ───────────────────────────

function SpinnerTabIcon({ active }: { active: boolean }) {
  const c = active ? '#FE5F2A' : '#868686';
  return (
    <Svg width={32} height={32} viewBox="14 14 28 28">
      <Path d="M27.5008 22.5996C27.0808 22.5996 26.8008 22.3196 26.8008 21.8996V16.2996C26.8008 15.8796 27.0808 15.5996 27.5008 15.5996C27.9208 15.5996 28.2008 15.8796 28.2008 16.2996V21.8996C28.2008 22.3196 27.9208 22.5996 27.5008 22.5996Z" fill={c} />
      <Path opacity={0.3} d="M27.4994 39.3988C27.0794 39.3988 26.7994 39.1188 26.7994 38.6988V33.0988C26.7994 32.6788 27.0794 32.3988 27.4994 32.3988C27.9194 32.3988 28.1994 32.6788 28.1994 33.0988V38.6988C28.1994 39.1188 27.9194 39.3988 27.4994 39.3988Z" fill={c} />
      <Path opacity={0.93} d="M30.2994 23.2988C30.1594 23.2988 30.0894 23.2988 29.9494 23.2288C29.6694 23.0188 29.5294 22.6688 29.7394 22.3188L32.5394 17.4888C32.7494 17.2088 33.0994 17.0688 33.4494 17.2788C33.7294 17.4888 33.8694 17.8388 33.6594 18.1888L30.8594 23.0188C30.7194 23.1588 30.5094 23.2988 30.2994 23.2988Z" fill={c} />
      <Path opacity={0.3} d="M21.8994 37.8588C21.7594 37.8588 21.6894 37.8588 21.5494 37.7888C21.2694 37.5788 21.1294 37.2288 21.3394 36.8788L24.1394 32.0488C24.3494 31.7688 24.6994 31.6288 25.0494 31.8388C25.3294 32.0488 25.4694 32.3988 25.2594 32.7488L22.4594 37.5788C22.3194 37.7188 22.1094 37.8588 21.8994 37.8588Z" fill={c} />
      <Path opacity={0.93} d="M24.6994 23.3005C24.4894 23.3005 24.2794 23.1605 24.1394 22.9505L21.3394 18.1205C21.1294 17.8405 21.2694 17.4205 21.5494 17.2105C21.8294 17.0005 22.2494 17.1405 22.4594 17.4205L25.2594 22.2505C25.4694 22.5305 25.3294 22.9505 25.0494 23.1605C24.9094 23.3005 24.8394 23.3005 24.6994 23.3005Z" fill={c} />
      <Path opacity={0.3} d="M33.0998 37.861C32.8898 37.861 32.6798 37.721 32.5398 37.511L29.7398 32.681C29.5298 32.401 29.6698 31.981 29.9498 31.771C30.2298 31.561 30.6498 31.701 30.8598 31.981L33.6598 36.811C33.8698 37.091 33.7298 37.511 33.4498 37.721C33.3098 37.791 33.2398 37.861 33.0998 37.861Z" fill={c} />
      <Path opacity={0.65} d="M21.8996 28.2008H16.2996C15.8796 28.2008 15.5996 27.9208 15.5996 27.5008C15.5996 27.0808 15.8796 26.8008 16.2996 26.8008H21.8996C22.3196 26.8008 22.5996 27.0808 22.5996 27.5008C22.5996 27.9208 22.3196 28.2008 21.8996 28.2008Z" fill={c} />
      <Path opacity={0.3} d="M38.7004 28.2008H33.1004C32.6804 28.2008 32.4004 27.9208 32.4004 27.5008C32.4004 27.0808 32.6804 26.8008 33.1004 26.8008H38.7004C39.1204 26.8008 39.4004 27.0808 39.4004 27.5008C39.4004 27.9208 39.1204 28.2008 38.7004 28.2008Z" fill={c} />
      <Path opacity={0.86} d="M22.6688 25.3294C22.5288 25.3294 22.4588 25.3294 22.3188 25.2594L17.4888 22.4594C17.2088 22.2494 17.0688 21.8994 17.2788 21.5494C17.4888 21.2694 17.8388 21.1294 18.1888 21.3394L23.0188 24.1394C23.2988 24.3494 23.4388 24.6994 23.2288 25.0494C23.0888 25.2594 22.8788 25.3294 22.6688 25.3294Z" fill={c} />
      <Path opacity={0.3} d="M37.2294 33.7298C37.0894 33.7298 37.0194 33.7298 36.8794 33.6598L32.0494 30.8598C31.7694 30.6498 31.6294 30.2998 31.8394 29.9498C32.0494 29.6698 32.3994 29.5298 32.7494 29.7398L37.5794 32.5398C37.8594 32.7498 37.9994 33.0998 37.7894 33.4498C37.6494 33.6598 37.4394 33.7298 37.2294 33.7298Z" fill={c} />
      <Path opacity={0.44} d="M17.7705 33.7314C17.5605 33.7314 17.3505 33.5914 17.2105 33.3814C17.0005 33.1014 17.1405 32.6814 17.4205 32.4714L22.2505 29.6714C22.5305 29.4614 22.9505 29.6014 23.1605 29.8814C23.3705 30.1614 23.2305 30.5814 22.9505 30.7914L18.1205 33.5914C18.0505 33.7314 17.9105 33.7314 17.7705 33.7314Z" fill={c} />
      <Path opacity={0.3} d="M32.331 25.331C32.121 25.331 31.911 25.191 31.771 24.981C31.561 24.701 31.701 24.281 31.981 24.071L36.811 21.271C37.091 21.061 37.511 21.201 37.721 21.481C37.931 21.761 37.791 22.181 37.511 22.391L32.681 25.191C32.541 25.331 32.471 25.331 32.331 25.331Z" fill={c} />
    </Svg>
  );
}

function FlameTabIcon({ active }: { active: boolean }) {
  const c = active ? '#FE5F2A' : '#868686';
  return (
    <Svg width={26} height={32} viewBox="76 14 23 28">
      <Path
        d="M82.9713 27.602C81.6166 26.677 81.6903 24.937 81.9717 22.9209C77.4642 25.7224 78.0281 33.71 81.5533 36.6346C85.0786 39.5588 89.8395 39.7 93.6856 36.5881C96.2687 34.498 97.4343 30.0507 94.6141 26.8817C94.0297 28.326 91.9894 28.1917 91.6132 27.0969C90.9297 25.1094 92.6771 23.7523 91.2264 19.899C90.318 17.4862 88.1375 15.5241 85.3257 16.2952C86.2189 17.4635 86.4981 18.4144 86.5219 19.2553C86.622 22.803 82.9344 23.5508 82.9713 27.602Z"
        stroke={c} strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </Svg>
  );
}

function BalloonTabIcon({ active }: { active: boolean }) {
  const c = active ? '#FE5F2A' : '#868686';
  return (
    <Svg width={22} height={32} viewBox="137 13 21 30">
      <Path d="M156.146 21.9121C156.997 27.9596 152.413 33.0288 148.951 33.5161C145.488 34.0034 139.682 30.3714 138.833 24.3458C138.673 23.2091 138.739 22.0521 139.026 20.9409C139.314 19.8296 139.817 18.7858 140.508 17.8691C141.199 16.9524 142.063 16.1807 143.052 15.5982C144.041 15.0156 145.135 14.6335 146.272 14.4738C147.409 14.314 148.566 14.3797 149.677 14.667C150.788 14.9544 151.832 15.4579 152.749 16.1486C153.665 16.8394 154.437 17.7039 155.02 18.6929C155.602 19.6819 155.984 20.776 156.144 21.9126L156.146 21.9121Z" stroke={c} strokeMiterlimit={10} fill="none" />
      <Path d="M146.411 30.3437C144.616 29.6327 142.743 27.9866 141.912 25.6699M153.611 40.6105C151.815 39.8996 150.148 38.4197 149.318 36.1036" stroke={c} strokeMiterlimit={10} strokeLinecap="round" fill="none" />
      <Path d="M148.085 33.634L147.584 36.3471L151.046 35.8604L149.816 33.3906L148.085 33.634Z" stroke={c} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function BubblesTabIcon({ active }: { active: boolean }) {
  const c = active ? '#FE5F2A' : '#868686';
  return (
    <Svg width={32} height={28} viewBox="193 13 34 30">
      <Circle cx={206.576} cy={29.2132} r={10.9124} stroke={c} fill="none" />
      <Circle cx={220.274} cy={18.9399} r={4.06495} stroke={c} fill="none" />
      <Path d="M200.05 30.9233C198.908 26.929 201.191 24.6465 201.191 24.6465" stroke={c} fill="none" />
      <Path d="M219.381 20.0833C218.488 18.6308 220.272 17.8008 220.272 17.8008" stroke={c} fill="none" />
    </Svg>
  );
}

// ─── Bottom bar ───────────────────────────────────────────────────────────────

type ContentTab = 'spinner' | 'fluid' | 'balloons' | 'bubbles';

const BOTTOM_TABS: { id: ContentTab; Icon: React.FC<{ active: boolean }> }[] = [
  { id: 'spinner',  Icon: SpinnerTabIcon },
  { id: 'fluid',    Icon: FlameTabIcon   },
  { id: 'balloons', Icon: BalloonTabIcon },
  { id: 'bubbles',  Icon: BubblesTabIcon },
];


function BottomBar({ tab, onTab, glass }: { tab: ContentTab; onTab: (t: ContentTab) => void; glass?: boolean }) {
  return (
    <View style={[bb.wrapper, glass && glassStyle]}>
      <View style={bb.tabsContainer}>
        {BOTTOM_TABS.map(({ id, Icon }) => {
          const active = tab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[bb.tabBtn, active && bb.tabBtnActive]}
              onPress={() => onTab(id)}
              activeOpacity={0.7}
            >
              <Icon active={active} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={bb.bottomRow}>
        <TouchableOpacity style={bb.supporterBtn} activeOpacity={0.8}>
          <Svg width={18} height={18} viewBox="66 14 20 20">
            <Path fillRule="evenodd" clipRule="evenodd" d="M77.4176 17.5822C77.078 16.8059 75.9204 16.8059 75.5808 17.5822L73.6445 22.0076L68.6153 22.3907C67.7339 22.4581 67.3763 23.5039 68.0482 24.0509L71.8785 27.1701L70.7082 31.8328C70.503 32.6503 71.4394 33.2968 72.1949 32.8584L76.4992 30.3597L80.8046 32.8584C81.559 33.2968 82.4955 32.6503 82.2902 31.8328L81.1199 27.1701L84.9502 24.0509C85.6221 23.5039 85.2645 22.4581 84.3831 22.3917L79.355 22.0076L77.4176 17.5822Z" fill="#FE5F2A" />
          </Svg>
          <Text style={bb.supporterText}>Add a Supporter <Text style={bb.supporterHere}>Here</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity style={bb.fab} activeOpacity={0.85}>
          <Svg width={20} height={20} viewBox="0 0 20 20">
            <Path d="M10 2V18M2 10H18" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const bb = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabBtn: {
    width: 60,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFDEC8',
    borderWidth: 1,
    borderColor: '#FE5F2A',
    borderRadius: 9,
    margin: 1,
    height: 53,
    width: 58,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supporterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#FE9069',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  supporterText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FE5F2A',
  },
  supporterHere: {
    textDecorationLine: 'underline',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FE5F2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlus: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 28,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

// ─── Glass style for fluid background overlay ─────────────────────────────────

const glassStyle = Platform.OS === 'web'
  ? {
      backgroundColor: 'rgba(255, 255, 255, 0.40)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    } as any
  : { backgroundColor: 'rgba(255, 255, 255, 0.40)' };

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen({ dark, desktop }: { dark?: boolean; desktop?: boolean }) {
  const [contentTab, setContentTab] = useState<ContentTab>('spinner');

  const isFlow = contentTab === 'fluid';
  const ic = '#1A1A1A';

  const handleTabChange = useCallback((t: ContentTab) => {
    setContentTab(t);
  }, []);

  return (
    <SafeAreaView style={[s.root, isFlow && s.rootFlow]}>

      {isFlow && <FluidBackground />}

      {/* Header */}
      <View style={isFlow ? glassStyle : undefined}>
        <View style={s.statusBar}>
          <Text style={s.statusTime}>9:41</Text>
          <View style={s.statusIcons}>
            <SignalBars color={ic} />
            <WifiIcon color={ic} />
            <BatteryIcon color={ic} />
          </View>
        </View>

        <View style={s.header}>
          <AlmondLogo height={26} />
          <View style={s.headerRight}>
            <BellIcon size={24} />
            <View style={s.avatar}><Text style={s.avatarLetter}>J</Text></View>
          </View>
        </View>

        <TabBar />
      </View>

      {/* Content */}
      <View style={s.content}>
        {contentTab === 'spinner' && (
          <View style={s.spinnerTab}>
            <View style={s.spinnerWrap}>
              <SpinnerWheel />
            </View>
          </View>
        )}

        {contentTab === 'balloons' && <BalloonsGame />}

        {contentTab === 'bubbles' && <BubbleWrap />}
      </View>

      {/* Always-visible bottom bar */}
      <BottomBar tab={contentTab} onTab={handleTabChange} />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#FFFFFF' },
  rootFlow:     { backgroundColor: 'transparent' },

  statusBar:    { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14 },
  statusTime:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.2 },
  statusIcons:  { flexDirection: 'row', alignItems: 'center' },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 18 },
  avatar:       { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '700', fontSize: 16 },

  content:      { flex: 1 },

  trackText:    { fontSize: 16, fontWeight: '500', color: '#FE5F2A', textAlign: 'center', paddingTop: 20, paddingHorizontal: 24 },
  spinnerTab:   { flex: 1 },
  spinnerWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
