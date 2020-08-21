import { SafeAreaView } from 'react-native';
import React from 'react';
import { Icon, Layout, Text, TopNavigation, TopNavigationAction } from '@ui-kitten/components';

const BackIcon = (props) => <Icon {...props} name="arrow-back" />;

export default function Profile({ route, navigation }) {
  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => <TopNavigationAction icon={BackIcon} onPress={navigateBack} />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation
        title={(evaProps) => (
          <Text {...evaProps} style={{ fontSize: 20, fontFamily: 'BreeSerif-Regular' }}>
            Profile
          </Text>
        )}
        alignment="center"
        accessoryLeft={BackAction}
      />
      <Layout style={{ flex: 1, paddingHorizontal: 30, alignItems: 'center' }}>
        <Text category="h3">{route?.params?.title}</Text>
      </Layout>
    </SafeAreaView>
  );
}
