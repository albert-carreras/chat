import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { getActiveRoute, route$ } from 'services/navigation/navigationService';
import { createNativeStackNavigator } from 'react-native-screens/native-stack';

import ChatsList from 'screens/ChatsList/ChatsList';
import Chat from 'screens/Chat/Chat';
import Settings from 'screens/Settings/Settings';
import Profile from 'screens/Profile/Profile';
import NewChat from 'screens/NewChat/NewChat';
import Login from 'screens/Login/Login';
import { useTheme } from '@ui-kitten/components';

const MainStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const LoggedOutStack = createNativeStackNavigator();

function MainStackScreen() {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme['background-basic-color-1'],
      }}
    >
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="ChatsList" component={ChatsList} initialParams={{ native: true }} />
        <MainStack.Screen name="Chat" component={Chat} initialParams={{ native: true }} />
      </MainStack.Navigator>
    </View>
  );
}

export default function MainNavigation({ loggedIn = false }) {
  const navigationRef = useRef();
  const handleOnRouteChange = useCallback((state) => {
    if (!state) {
      const route = navigationRef.current?.getCurrentRoute();
      return route$.next(route);
    }
    route$.next(getActiveRoute(state));
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} onReady={handleOnRouteChange} onStateChange={handleOnRouteChange}>
        {!loggedIn ? (
          <LoggedOutStack.Navigator screenOptions={{ stackPresentation: 'modal', headerShown: false }}>
            <LoggedOutStack.Screen name="Login" component={Login} initialParams={{ native: true }} />
          </LoggedOutStack.Navigator>
        ) : (
          <RootStack.Navigator screenOptions={{ stackPresentation: 'modal', headerShown: false }}>
            <RootStack.Screen name="Main" component={MainStackScreen} initialParams={{ native: true }} />
            <RootStack.Screen name="Settings" component={Settings} initialParams={{ native: true }} />
            <RootStack.Screen name="Profile" component={Profile} initialParams={{ native: true }} />
            <RootStack.Screen name="NewChat" component={NewChat} initialParams={{ native: true }} />
          </RootStack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
