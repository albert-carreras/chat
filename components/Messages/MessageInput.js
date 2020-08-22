import { Icon, useTheme } from '@ui-kitten/components';
import React, { useRef, useCallback } from 'react';
import { AutoGrowingTextInput } from 'react-native-autogrow-textinput';
import { TouchableOpacity, View } from 'react-native';
import isIos from 'utilities/isIos';
import { useObservableState } from 'observable-hooks';
import themeService from 'services/navigation/themeService';

export default function MessageInput({ onType, onSend }) {
  const isDark = useObservableState(themeService.getIsDark$());
  const theme = useTheme();
  const isTypingClear = useRef(null);
  let value = useRef('');
  let inputRef = useRef(null);

  const typeMessage = useCallback(
    (messageText) => {
      if (isTypingClear.current) {
        clearTimeout(isTypingClear.current);
      } else if (messageText) {
        onType(true);
      }
      isTypingClear.current = setTimeout(() => {
        onType(false);
        isTypingClear.current = null;
      }, 3000);
      value.current = messageText;
    },
    [onType],
  );

  const handleSend = () => {
    if (value.current) {
      onSend(value.current);
      value.current = '';
      inputRef?.current?.clear();
    }
  };

  return (
    <View style={{ flexDirection: 'row', margin: 10 }}>
      <AutoGrowingTextInput
        ref={inputRef}
        placeholder="What to say"
        placeholderTextColor={isDark ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.7)'}
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
