import { Icon, useTheme } from '@ui-kitten/components';
import React, { useState } from 'react';
import { AutoGrowingTextInput } from 'react-native-autogrow-textinput';
import { TouchableOpacity, View } from 'react-native';
import isIos from 'utilities/isIos';
import { useObservableState } from 'observable-hooks';
import themeService from 'services/navigation/themeService';

export default function MessageInput({ onType, onSend }) {
  const [messageValue, setMessageValue] = useState('');
  const isDark = useObservableState(themeService.getIsDark$());
  const theme = useTheme();

  const typeMessage = (messageText) => {
    setMessageValue(messageText);
    const isTyping = messageText.length > 0;
    onType(isTyping);
  };

  const handleSend = () => {
    onSend(messageValue);
    setMessageValue('');
  };

  return (
    <View style={{ flexDirection: 'row', margin: 10 }}>
      <AutoGrowingTextInput
        placeholder="What to say"
        placeholderTextColor={isDark ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.7)'}
        value={messageValue}
        onChangeText={typeMessage}
        style={{
          flex: 1,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingTop: isIos() ? 6 : 0,
          paddingBottom: isIos() ? 6 : 2,
          fontSize: 16,
          letterSpacing: 0.3,
          fontWeight: '400',
          borderWidth: 1,
          borderColor: theme['color-primary-active'],
          color: theme['text-basic-color'],
        }}
      />
      <TouchableOpacity
        disabled={messageValue.length === 0}
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: 8,
          marginRight: 8,
        }}
        onPress={handleSend}
      >
        <Icon name="arrow-circle-up" style={{ height: 35, width: 35 }} fill={theme['color-primary-active']} />
      </TouchableOpacity>
    </View>
  );
}
