import { SafeAreaView } from 'react-native';
import React, { useCallback } from 'react';
import { Button, Divider, Icon, Layout, Text, TopNavigation, TopNavigationAction } from '@ui-kitten/components';

import authService from 'services/auth/authService';

const BackIcon = (props) => <Icon {...props} name="arrow-back" />;

export default function Settings({ navigation }) {
  const signOut = useCallback(() => {
    authService.logout();
  }, []);

  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => <TopNavigationAction icon={BackIcon} onPress={navigateBack} />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation
        title={(evaProps) => (
          <Text {...evaProps} style={{ fontSize: 20, fontFamily: 'BreeSerif-Regular' }}>
            Settings
          </Text>
        )}
        alignment="center"
        accessoryLeft={BackAction}
      />
      <Layout style={{ flex: 1, paddingHorizontal: 30, justifyContent: 'center' }}>
        <Button onPress={signOut}>Logout</Button>
      </Layout>
    </SafeAreaView>
  );
}
