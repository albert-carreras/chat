import { useTheme } from '@ui-kitten/components';
import { useObservableState } from 'observable-hooks';
import React from 'react';
import { Text } from '@ui-kitten/components';
import Bubble from './Bubble';
import users from 'services/chat/userService';
import { View } from 'react-native';

export default function TextMessage({ message, prevSame, nextSame }) {
  const theme = useTheme();
  const myUser = users.getMyUser();
  const content = useObservableState(message.content$);
  const status = useObservableState(message.status$);
  const props = { prevSame, nextSame };
  const isMe = myUser.id === message.sender.id;

  return (
    <Bubble isMe={isMe} status={status}>
      <View
        {...props}
        isMe={isMe}
        underlayColor={isMe ? theme['color-primary-700'] : theme['background-basic-color-2']}
        style={{
          backgroundColor: isMe ? theme['color-primary-active'] : theme['background-basic-color-2'],
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 8,
          paddingBottom: 8,

          marginTop: 2,
          marginBottom: nextSame ? 1 : 4,
          borderRadius: 18,
          // isMe ?
          //   prevSame ? `border-top-right-radius: ${sharpBorderRadius};` : ''}
          //   nextSame ? `border-bottom-right-radius: sharpBorderRadius};` : ''}
          // ` : `
          //   ${prevSame ? `border-top-left-radius: ${sharpBorderRadius};` : ''}
          //   ${nextSame ? `border-bottom-left-radius: ${sharpBorderRadius};` : ''}
          // `}
        }}
      >
        <Text>{content?.text}</Text>
      </View>
    </Bubble>
  );
}
