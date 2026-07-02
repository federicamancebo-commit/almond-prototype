import React from 'react';
import { Platform } from 'react-native';
import PhoneMockup from './src/components/PhoneMockup';
import HomeScreen from './src/screens/HomeScreen';

function isDesktopMode() {
  if (Platform.OS !== 'web') return false;
  return new URLSearchParams(window.location.search).has('desktop');
}

export default function App() {
  if (isDesktopMode()) {
    return <HomeScreen desktop />;
  }

  return (
    <PhoneMockup>
      <HomeScreen />
    </PhoneMockup>
  );
}
