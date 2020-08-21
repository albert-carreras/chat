import { SafeAreaView } from 'react-native';
import React, { useState } from 'react';
import { Icon, Layout, TopNavigation, TopNavigationAction, Input, Button, Text } from '@ui-kitten/components';
import chatService from 'services/chat/chatService';

const BackIcon = (props) => <Icon {...props} name="arrow-back" />;

export default function NewChat({ navigation }) {
  const [searchValue, setSearchValue] = useState('');

  const typeSearch = (messageText) => {
    setSearchValue(messageText);
  };

  const onSubmit = async (value) => {
    if (!value) {
      return;
    }
    const options = {
      visibility: 'private',
      invite: [`@${value.toLowerCase()}:drippy`],
      is_direct: 'true',
    };

    const chat = await chatService.createChat(options);

    if (chat && !chat.error) {
      navigation.navigate('Chat', { roomId: chat.roomId, title: chat.name });
    }
  };

  const handleSubmit = () => {
    onSubmit(searchValue);
    setSearchValue('');
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => <TopNavigationAction icon={BackIcon} onPress={navigateBack} />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation
        title={(evaProps) => (
          <Text {...evaProps} style={{ fontSize: 20, fontFamily: 'BreeSerif-Regular' }}>
            New Chat
          </Text>
        )}
        alignment="center"
        accessoryLeft={BackAction}
      />
      <Layout style={{ flex: 1, paddingHorizontal: 30, justifyContent: 'center' }}>
        <Input
          placeholder="Who to chat with?"
          value={searchValue}
          onChangeText={typeSearch}
          autofocus
          returnKeyType="go"
          autoCapitalize="none"
        />
        <Button style={{ marginTop: 20 }} onPress={handleSubmit}>
          Talk
        </Button>
      </Layout>
    </SafeAreaView>
  );
}
