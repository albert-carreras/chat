import { KeyboardAvoidingView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, Icon, Layout, Text, TopNavigation, TopNavigationAction } from '@ui-kitten/components';
import ImagePicker from 'react-native-image-picker';

import MessageInput from 'components/Messages/MessageInput';
import Timeline from './Timeline';
import chatService from 'services/chat/chatService';
import { useObservableState } from 'observable-hooks';
import ios from 'utilities/isIos';
const isIos = ios();

const ProfileIcon = (props) => <Icon {...props} name="person-outline" />;
const BackIcon = (props) => <Icon {...props} name="arrow-back" />;

export default function Chat({ route, navigation }) {
  const [chat, setChat] = useState(chatService.getChatById(route.params.roomId));
  const isTyping = useObservableState(chat.typing$);

  const onType = (typing) => {
    chat.setTyping(typing);
  };

  const onSend = (messageText) => {
    chat.sendMessage(messageText, 'm.text');
  };

  const handleImagePick = () => {
    try {
      ImagePicker.showImagePicker(async (response) => {
        if (response.didCancel) return;

        chat.sendMessage(response, 'm.image');
      });
    } catch (e) {
      console.log('onImagePick error', e);
    }
  };

  useEffect(() => {
    if (!route.params.roomId) {
      console.log('No room ID, leaving Chat…');
      navigation.navigate('ChatsList');
    }
    if (chat.id !== route.params.roomId) {
      console.log('ChatId', route.params.roomId);
      setChat(chatService.getChatById(route.params.roomId));
    }
  }, [chat.id, navigation, route.params.roomId]);

  const navigateBack = () => {
    navigation.goBack();
  };

  const navigateProfile = () => {
    navigation.navigate('Profile', { title: route?.params?.title });
  };

  const BackAction = () => (
    <TopNavigationAction
      hitSlop={{ top: 100, left: 20, right: 20, bottom: 100 }}
      style={{ justifyContent: 'center', height: 40 }}
      icon={BackIcon}
      onPress={navigateBack}
    />
  );

  const ProfileAction = () => (
    <TopNavigationAction
      hitSlop={{ top: 100, left: 20, right: 20, bottom: 100 }}
      style={{ justifyContent: 'center', height: 40 }}
      icon={ProfileIcon}
      onPress={navigateProfile}
    />
  );
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Layout style={{ flex: 1 }}>
        <TopNavigation
          subtitle={isTyping?.length > 0 ? 'typing...' : null}
          title={(evaProps) => (
            <Text {...evaProps} style={{ fontSize: 20, fontFamily: 'BreeSerif-Regular' }}>
              {route?.params?.title}
            </Text>
          )}
          alignment="center"
          accessoryLeft={BackAction}
          accessoryRight={ProfileAction}
        />
        <Divider
          style={{
            height: 1,
            backgroundColor: '#bbb',
          }}
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={isIos ? 'padding' : 'null'} keyboardVerticalOffset={50}>
          <Timeline chat={chat} />
          <MessageInput onSend={onSend} onType={onType} />
        </KeyboardAvoidingView>
      </Layout>
    </SafeAreaView>
  );
}
