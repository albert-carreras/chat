import { Avatar, Text, ListItem } from '@ui-kitten/components';
import moment from 'moment';
import { useObservableState } from 'observable-hooks';
import React from 'react';
import { View } from 'react-native';

const AvatarIcon = (props) => {
  console.log(props.avatarUrl ? { uri: props.avatarUrl } : null);
  return (
    <Avatar
      size="large"
      source={props.avatarUrl ? { uri: props.avatarUrl } : require('../../assets/jeje.png')}
      style={{ backgroundColor: '#ddd' }}
    />
  );
};

const AccessoryRight = (props) => (
  <>
    <Text category="c1" appearance="hint" numberOfLines={1}>
      {moment(props.timestamp).fromNow()}
    </Text>
    {props.readState === 'unread' && (
      <View
        style={{
          marginLeft: 15,
          height: 20,
          width: 20,
          backgroundColor: '#ddd',
          borderRadius: 50,
        }}
      />
    )}
  </>
);

export default function ChatListItem({ chat, navigateChat }) {
  const name = useObservableState(chat.name$);
  const snippet = useObservableState(chat.snippet$);
  const readState = useObservableState(chat.readState$);
  return (
    <ListItem
      accessoryLeft={() => <AvatarIcon avatarUrl={chat.getAvatarUrl()} />}
      accessoryRight={(props) => <AccessoryRight timestamp={snippet?.timestamp} readState={readState} {...props} />}
      title={name}
      description={snippet?.content}
      onPress={() => navigateChat({ title: name, roomId: chat.id })}
    />
  );
}
