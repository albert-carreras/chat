import { Spinner } from '@ui-kitten/components';
import React from 'react';
import { View } from 'react-native';
// import styled from 'styled-components/native';
//
// import EventMessage from './components/EventMessage';
// import ImageMessage from './components/ImageMessage';
// import NoticeMessage from './components/NoticeMessage';
// import TextMessage from './components/TextMessage';
// import TypingIndicator from './components/TypingIndicator';
import MessageClass from 'services/chat/Message';
import messages from 'services/chat/messageService';
import TextMessage from './TextMessage';

// const debug = require('debug')('ditto:scenes:chat:message:MessageItem')

function isSameSender(messageA, messageB) {
  if (
    !messageA ||
    !messageB ||
    !MessageClass.isBubbleMessage(messageA) ||
    !MessageClass.isBubbleMessage(messageB) ||
    messageA.sender.id !== messageB.sender.id
  ) {
    return false;
  }
  return true;
}

export default function Message({ chatId, messageId, prevMessageId, nextMessageId, ...otherProps }) {
  if (messageId === 'loading') {
    return <Loading />;
  }
  if (messageId === 'typing') {
    return null; // <TypingIndicator />;
  }

  const message = messages.getMessageById(messageId, chatId);
  const prevMessage =
    prevMessageId && prevMessageId !== 'loading' ? messages.getMessageById(prevMessageId, chatId) : null;
  const nextMessage =
    nextMessageId && nextMessageId !== 'typing' ? messages.getMessageById(nextMessageId, chatId) : null;
  const prevSame = isSameSender(message, prevMessage);
  const nextSame = isSameSender(message, nextMessage);
  const props = { ...otherProps, message, prevSame, nextSame };

  if (MessageClass.isTextMessage(message.type)) {
    return <TextMessage {...props} />;
  }
  return null;
  // if (Message.isImageMessage(message.type)) {
  //   return <ImageMessage {...props} />;
  // }
  // if (Message.isNoticeMessage(message.type)) {
  //   return <NoticeMessage {...props} />;
  // }
  // return <EventMessage {...props} />;
}

const Loading = () => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 10,
    }}
  >
    <Spinner />
  </View>
);
