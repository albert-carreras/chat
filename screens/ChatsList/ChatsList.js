import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback } from 'react';
import { List, Divider, Icon, Layout, TopNavigation, TopNavigationAction, Text } from '@ui-kitten/components';
import chatService from 'services/chat/chatService';
import { useObservableState } from 'observable-hooks';
import ChatListItem from './ChatListItem';

const NewChatIcon = (props) => <Icon {...props} name="edit-2-outline" />;
const SettingsIcon = (props) => <Icon {...props} name="settings-outline" />;
const Title = () => <Text category="h4">Chat.</Text>;

export default function ChatsList({ navigation }) {
  const chatList = useObservableState(chatService.getListByType$('direct'));

  const navigateChat = useCallback(
    ({ title, roomId }) => {
      navigation.navigate('Chat', { title, roomId });
    },
    [navigation],
  );

  const navigateNewChat = useCallback(() => {
    navigation.navigate('NewChat');
  }, [navigation]);

  const navigateSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const RightAction = useCallback(
    () => (
      <>
        <TopNavigationAction
          hitSlop={{ top: 100, left: 20, right: 20, bottom: 100 }}
          style={{ justifyContent: 'center', height: 40 }}
          icon={NewChatIcon}
          onPress={navigateNewChat}
        />
        <TopNavigationAction
          hitSlop={{ top: 100, left: 12, right: 20, bottom: 100 }}
          style={{ marginLeft: 12, justifyContent: 'center', height: 40 }}
          icon={SettingsIcon}
          onPress={navigateSettings}
        />
      </>
    ),
    [navigateNewChat, navigateSettings],
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation accessoryLeft={Title} alignment="start" accessoryRight={RightAction} />
      <Divider
        style={{
          height: 1,
          backgroundColor: '#bbb',
        }}
      />
      <Layout style={{ flex: 1 }}>
        <List
          data={chatList}
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => <ChatListItem chat={item} navigateChat={navigateChat} />}
        />
      </Layout>
    </SafeAreaView>
  );
}
