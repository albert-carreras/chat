import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useCallback, useRef } from 'react';
import { getActiveRoute, route$ } from 'services/navigation/navigationService';

import ChatsList from 'screens/ChatsList/ChatsList';
import Chat from 'screens/Chat/Chat';
import Settings from 'screens/Settings/Settings';
import Profile from 'screens/Profile/Profile';
import NewChat from 'screens/NewChat/NewChat';
import Login from 'screens/Login/Login';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();
const LoggedOutStack = createStackNavigator();

function MainStackScreen() {
  return (
    <MainStack.Navigator screenOptions={{ cardOverlayEnabled: false }} headerMode="none">
      <MainStack.Screen name="ChatsList" component={ChatsList} />
      <MainStack.Screen name="Chat" component={Chat} />
    </MainStack.Navigator>
  );
}

export default function MainNavigation({ navigation, route, loggedIn = false }) {
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
          <LoggedOutStack.Navigator headerMode="none">
            <LoggedOutStack.Screen name="Login" component={Login} />
          </LoggedOutStack.Navigator>
        ) : (
          <RootStack.Navigator headerMode="none">
            <RootStack.Screen name="Main" component={MainStackScreen} />
            <RootStack.Screen
              name="Settings"
              component={Settings}
              options={{
                gestureEnabled: true,
                cardOverlayEnabled: true,
                ...TransitionPresets.ModalPresentationIOS,
              }}
            />
            <RootStack.Screen
              name="Profile"
              component={Profile}
              options={{
                gestureEnabled: true,
                cardOverlayEnabled: true,
                ...TransitionPresets.ModalPresentationIOS,
              }}
            />
            <RootStack.Screen
              name="NewChat"
              component={NewChat}
              options={{
                gestureEnabled: true,
                cardOverlayEnabled: true,
                ...TransitionPresets.ModalPresentationIOS,
              }}
            />
          </RootStack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
