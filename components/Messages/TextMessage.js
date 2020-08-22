import { useTheme } from '@ui-kitten/components';
import { useObservableState } from 'observable-hooks';
import React, { useCallback } from 'react';
import { Text } from '@ui-kitten/components';
import Bubble from './Bubble';
import users from 'services/chat/userService';
import { View } from 'react-native';
import themeService from 'services/navigation/themeService';
import moment from 'moment';

export default function TextMessage({ message, prevSame, nextSame }) {
  const theme = useTheme();
  const myUser = users.getMyUser();
  const content = useObservableState(message.content$);
  const status = useObservableState(message.status$);
  const isDark = useObservableState(themeService.getIsDark$());
  const props = { prevSame, nextSame };
  const isMe = myUser.id === message.sender.id;

  const getBorderRadius = () => {
    let borders = {};
    if (isMe) {
      if (prevSame) {
        borders = { ...borders, borderTopRightRadius: 2 };
      }
      if (nextSame) {
        borders = { ...borders, borderBottomRightRadius: 2 };
      }
    } else {
      if (prevSame) {
        borders = { ...borders, borderTopLeftRadius: 2 };
      }
      if (nextSame) {
        borders = { ...borders, borderBottomLeftRadius: 2 };
      }
    }
    return borders;
  };

  const getTextColor = () => {
    if (isMe) {
      if (isDark) {
        return theme['text-basic-color'];
      }
      return theme['text-alternate-color'];
    }
    return theme['text-basic-color'];
  };

  const getTimestamp = useCallback(() => moment(message.timestamp).format('HH:mm'), []);

  return (
    <Bubble isMe={isMe} status={status}>
      <View
        {...props}
        isMe={isMe}
        style={[
          {
            backgroundColor: isMe ? theme['color-primary-active'] : theme['background-basic-color-4'],
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 8,
            paddingBottom: 8,

            marginTop: 2,
            marginBottom: nextSame ? 1 : 4,
            borderRadius: 18,
          },
          { ...getBorderRadius() },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: getTextColor() }}>{content?.text}</Text>
          <Text category="label" style={isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }}>
            {getTimestamp()}
          </Text>
        </View>
      </View>
    </Bubble>
  );
}
