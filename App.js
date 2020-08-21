import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { useObservableState } from 'observable-hooks';
import { Appearance, Dimensions, Image, StatusBar } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { default as lightTheme } from './lightTheme.json';
import { default as darkTheme } from './darkTheme.json';
import { default as mapping } from './mapping.json';

import './utilities/matrix-polyfill';

import authService from 'services/auth/authService';
import synapseService from 'services/auth/synapseService';
import MainNavigation from 'services/navigation/MainNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import navigationService, { route$ } from './services/navigation/navigationService';

const colorsDark = ['#1A2138', '#222B45'];
const colorsLight = ['#F7F9FC', '#FFFFFF'];

function App() {
  const authLoaded = useObservableState(authService.isLoaded$());
  const data = useObservableState(authService.getData$());
  const matrixReady = useObservableState(synapseService.isReady$());
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const isDark = useRef(colorScheme === 'dark');
  const [bottomColor, setBottomColor] = useState(1);
  const [topColor, setTopColor] = useState(0);

  const isLoggedIn = data?.userId && data?.accessToken;

  useEffect(() => {
    const listener = ({ colorScheme }) => {
      setColorScheme(colorScheme);
    };
    Appearance.addChangeListener(listener);
    route$.subscribe((route) => {
      if (['ChatsList', 'Chat'].includes(route?.name)) {
        setTopColor(1);
      } else {
        setTopColor(0);
      }
      // Bottom Color
      if (['ChatsList'].includes(route?.name)) {
        setBottomColor(0);
      } else {
        setBottomColor(1);
      }
    });
    return () => {
      Appearance.removeChangeListener(listener);
    };
  }, []);
  if (!authLoaded || (isLoggedIn && !matrixReady)) {
    return <Splash />;
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={{ flex: 0, backgroundColor: isDark.current ? colorsDark[topColor] : colorsLight[topColor] }}
      />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: isDark.current ? colorsDark[bottomColor] : colorsLight[bottomColor] }}
      >
        <ApplicationProvider
          {...eva}
          customMapping={mapping}
          theme={isDark.current ? { ...eva.dark, ...darkTheme } : { ...eva.light, ...lightTheme }}
        >
          <IconRegistry icons={EvaIconsPack} />
          <MainNavigation loggedIn={isLoggedIn} />
        </ApplicationProvider>
      </SafeAreaView>
    </>
  );
}

const Splash = () => (
  <Image
    source={require('./assets/images/splash.png')}
    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
    resizeMode="cover"
  />
);

export default App;
