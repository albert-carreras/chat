import { useIsFocused } from '@react-navigation/native';
import { useObservableState } from 'observable-hooks';
import React, { useEffect, useState } from 'react';
import { AppState, FlatList } from 'react-native';

import Message from 'components/Messages/Message';

export default function Timeline({ chat }) {
  const [appState, setAppState] = useState(AppState.currentState);
  const [isLoading, setIsLoading] = useState(false);
  const isFocused = useIsFocused();
  const messageList = useObservableState(chat.messages$);
  const atStart = useObservableState(chat.atStart$);
  const [timeline, setTimeline] = useState(messageList);

  const handleEndReached = async () => {
    if (!atStart && !isLoading) {
      setIsLoading(true);
      await chat.fetchPreviousMessages();
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const onAppStateChange = (nextAppState) => {
      setAppState(nextAppState);
    };
    AppState.addEventListener('change', onAppStateChange);

    return () => {
      AppState.removeEventListener('change', onAppStateChange);
    };
  }, []);

  useEffect(() => {
    if (appState === 'active' && isFocused) chat.sendReadReceipt();
  }, [appState, chat, isFocused, messageList]);

  useEffect(() => {
    const tempTimeline = messageList ? [...messageList] : [];
    if (isLoading) tempTimeline.push('loading');
    setTimeline(tempTimeline);
  }, [isLoading, messageList]);

  return (
    <FlatList
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      inverted
      data={timeline}
      renderItem={({ item: messageId, index }) => (
        <Message
          chatId={chat.id}
          messageId={messageId}
          prevMessageId={messageList[index + 1] ? messageList[index + 1] : null}
          nextMessageId={messageList[index - 1] ? messageList[index - 1] : null}
        />
      )}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      keyExtractor={(item) => item}
    />
  );
}
