import { Icon, Spinner } from '@ui-kitten/components';
import React from 'react';
import { View } from 'react-native';

import { MessageStatus } from 'services/chat/Message';

export default function Bubble({ children, isMe, status }) {
  return (
    <View
      style={{
        flexDirection: isMe ? 'row-reverse' : 'row',
        marginLeft: 13,
        marginRight: '10%',
      }}
    >
      {children}
      <View
        style={{
          justifyContent: 'center',
          width: 30,
        }}
      >
        <StatusIcon status={status} />
      </View>
    </View>
  );
}

const StatusIcon = ({ status }) => {
  if (status === MessageStatus.NOT_SENT || status === MessageStatus.NOT_UPLOADED) {
    return <Icon name="alert-triangle" />;
  } else if (status) {
    return <Spinner size="small" />;
  } else {
    return null;
  }
};
