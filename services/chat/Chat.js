import { isEqual } from 'lodash';
import { EventTimeline } from 'matrix-js-sdk';
import { InteractionManager } from 'react-native';
import { BehaviorSubject } from 'rxjs';

import synapseService from 'services/auth/synapseService';
import Message, { MessageStatus } from './Message';
import messages from './messageService';

const TYPING_TIMEOUT = 1000 * 15; // 15s

export const ChatDetails = {
  // All the info shown in DirectChatLists
  SUMMARY: {
    direct: true,
    state: true,
    timeline: true,
    receipt: true,
  },
  // All the info shown in ChatScreen
  ALL: {
    direct: true,
    state: true,
    timeline: true,
    receipt: true,
    messages: { all: true },
  },
};

export default class Chat {
  constructor(roomId, synapseRoom) {
    this.id = this.key = roomId;

    if (!synapseRoom) {
      this._room = synapseService.getClient().getRoom(roomId);
      if (!this._room) throw Error(`Could not find matrix room with roomId ${roomId}`);
    } else this._room = synapseRoom;

    this._ephemeral = {
      typing: { active: false, timer: null },
    };
    this._pending = [];

    this.name$ = new BehaviorSubject(this._room.name);
    this.isDirect$ = new BehaviorSubject(this._isDirect());
    this.avatar$ = new BehaviorSubject(this._getAvatar());
    this.typing$ = new BehaviorSubject([]);
    this.messages$ = new BehaviorSubject(this._getMessages());
    this.snippet$ = new BehaviorSubject(this._getSnippet());
    this.readState$ = new BehaviorSubject(this._getReadState());
    this.atStart$ = new BehaviorSubject(this._isAtStart());
  }

  removePendingMessage(id) {
    const messageIndex = this._pending.findIndex((messageId) => messageId === id);
    if (messageIndex !== -1) this._pending.splice(messageIndex, 1);
  }

  async update(changes) {
    return InteractionManager.runAfterInteractions(() => {
      if (changes.direct) {
        const newDirect = this._isDirect();
        if (this.isDirect$.getValue() !== newDirect) this.isDirect$.next(newDirect);
      }

      if (changes.state || changes.direct) {
        const newName = this._room.name;
        if (this.name$.getValue() !== newName) this.name$.next(newName);

        const newAvatar = this._getAvatar();
        if (this.avatar$.getValue() !== newAvatar) this.avatar$.next(newAvatar);
      }

      if (changes.timeline) {
        const newMessages = this._getMessages();
        if (!isEqual(this.messages$.getValue(), newMessages)) {
          this.messages$.next(newMessages);
          messages.cleanupRoomMessages(this.id, newMessages);
        }

        const newAtStart = this._isAtStart();
        if (this.atStart$.getValue() !== newAtStart) this.atStart$.next(newAtStart);
      }

      if (changes.typing) {
        let changed = false;
        const myUserId = synapseService.getClient().getUserId();
        const oldTyping = this.typing$.getValue();
        const newTyping = [];

        for (const userId of changes.typing) {
          if (userId !== myUserId) {
            if (oldTyping[newTyping.length] !== userId) changed = true;
            newTyping.push(userId);
          }
        }
        if (oldTyping.length !== newTyping.length) changed = true;

        if (changed) this.typing$.next(newTyping);
      }

      if (changes.typing || changes.timeline) {
        const newSnippet = this._getSnippet();
        if (this.snippet$.getValue().content !== newSnippet.content) {
          this.snippet$.next(newSnippet);
        }
      }

      if (changes.receipt || changes.timeline) {
        const newReadState = this._getReadState();
        if (this.readState$.getValue() !== newReadState) this.readState$.next(newReadState);
      }

      if (changes.messages) {
        if (changes.messages.all) messages.updateRoomMessages(this.id);
        else {
          for (const eventId of Object.keys(changes.messages)) {
            messages.updateMessage(eventId, this.id);
          }
        }
      }
    });
  }

  _getAvatar() {
    const roomState = this._room.getLiveTimeline().getState(EventTimeline.FORWARDS);
    const avatarEvent = roomState.getStateEvents('m.room.avatar', '');
    let avatar = avatarEvent ? avatarEvent.getContent().url : null;

    if (!avatar && this.isDirect$.getValue()) {
      const fallbackMember = this._room.getAvatarFallbackMember();
      avatar = fallbackMember ? synapseService.getClient().getUser(fallbackMember.userId)?.avatarUrl : null;
    }
    return avatar;
  }

  _getMessages() {
    const chatMessages = [];
    const roomEvents = this._room.getLiveTimeline().getEvents();

    for (const roomEvent of roomEvents) {
      if (Message.isEventDisplayed(roomEvent)) {
        chatMessages.unshift(roomEvent.getId());
      }
    }

    const pendingEvents = this._room.getPendingEvents();
    for (const pendingEvent of pendingEvents) {
      if (Message.isEventDisplayed(pendingEvent)) {
        chatMessages.unshift(pendingEvent.getId());
      }
    }

    const localPendingMessages = this._pending;
    for (const pendingMessageId of localPendingMessages) {
      chatMessages.unshift(pendingMessageId);
    }
    return chatMessages;
  }

  _getReadState() {
    const latestMessage = this.messages$.getValue()[0];

    if (!this._room.hasUserReadEvent(synapseService.getClient().getUserId(), latestMessage)) {
      return 'unread';
    }

    for (const member of this._room.getJoinedMembers()) {
      if (!this._room.hasUserReadEvent(member.userId, latestMessage)) {
        return 'readByMe';
      }
    }

    return 'readByAll';
  }

  _getSnippet() {
    const snippet = {};
    const chatMessages = this.messages$.getValue();
    const lastMessage = messages.getMessageById(chatMessages[0], this.id);

    snippet.timestamp = lastMessage?.timestamp;

    const typing = this.typing$.getValue();
    if (typing.length > 0) {
      if (typing.length > 1) {
        snippet.content = 'messages:content.groupTyping';
      } else {
        snippet.content = 'typing...';
      }
    } else {
      if (lastMessage) {
        snippet.content = lastMessage.content$.getValue().text;
      }
    }

    return snippet;
  }

  _isAtStart() {
    const start = !this._room.getLiveTimeline().getPaginationToken(EventTimeline.BACKWARDS);

    return start;
  }

  _isDirect() {
    try {
      const directEvent = synapseService.getClient().getAccountData('m.direct');
      const aDirectRooms = directEvent ? Object.values(directEvent.getContent()) : [];
      let directRooms = [];
      for (const array of aDirectRooms) {
        directRooms = [...directRooms, ...array];
      }
      if (directRooms.length > 0 && directRooms.includes(this.id)) return true;

      return false;
    } catch (e) {
      console.log('Error in _isDirect', e);
    }
  }

  async leave() {
    try {
      await synapseService.getClient().leave(this.id);
    } catch (e) {
      console.log('Error leaving room %s:', this.id, e);
    }

    await synapseService.getClient().forget(this.id);
  }

  async fetchPreviousMessages() {
    try {
      // TODO: Improve this and gaps detection
      await synapseService.getClient().paginateEventTimeline(this._room.getLiveTimeline(), { backwards: true });

      this.update({ timeline: true });
    } catch (e) {
      console.log('Error fetching previous messages for chat %s', this.id, e);
    }
  }

  async sendMessage(content, type) {
    switch (type) {
      case 'm.image': {
        // Add or get pending message
        const event = {
          type,
          timestamp: Date.now(),
          status: MessageStatus.UPLOADING,
          content: content,
        };
        const pendingMessage = messages.getMessageById(`~~${this.id}:${content.fileName}`, this.id, event, true);
        // If it's already pending, we update the status, otherwise we add it
        if (this._pending.includes(pendingMessage.id)) {
          console.log('Pending message already existed');
          pendingMessage.update({ status: MessageStatus.UPLOADING });
        } else {
          console.log('Pending message created');
          this._pending.push(pendingMessage.id);
          this.update({ timeline: true });
        }

        // Upload image
        const response = await synapseService.uploadImage(content);
        console.log('uploadImage response', response);

        if (!response) {
          // TODO: handle upload error
          pendingMessage.update({ status: MessageStatus.NOT_UPLOADED });
          return {
            error: 'CONTENT_NOT_UPLOADED',
            message: 'messages:content.contentNotUploadedNotice',
          };
        } else content.url = response;
        break;
      }
      default:
    }
    return messages.send(content, type, this.id);
  }

  async sendPendingEvents() {
    const matrixPendingEvents = this._room.getPendingEvents();
    for (const pendingEvent of matrixPendingEvents) {
      if (pendingEvent.getAssociatedStatus() === MessageStatus.NOT_SENT) {
        await synapseService.getClient().resendEvent(pendingEvent, this._room);
      }
    }

    for (const pendingMessageId of this._pending) {
      const pendingMessage = messages.getMessageById(pendingMessageId, this.id);
      if (pendingMessage.status$.getValue() === MessageStatus.NOT_UPLOADED) {
        await this.sendMessage(pendingMessage.content$.getValue().raw, pendingMessage.type);
      }
    }
  }

  async sendReadReceipt() {
    const latestMessage = this.messages$.getValue()[0];
    const readState = this._getReadState();
    if (readState === 'unread') {
      const matrixEvent = this._room.findEventById(latestMessage);
      await synapseService.getClient().sendReadReceipt(matrixEvent);
    }
  }

  async setTyping(typing) {
    const state = this._ephemeral.typing;
    if (!state.timer && typing && !state.active) {
      // We were not typing or the timeout is almost reached
      state.timer = setTimeout(() => {
        state.timer = null;
        state.active = false;
      }, TYPING_TIMEOUT);
      state.active = true;
      synapseService.getClient().sendTyping(this.id, true, TYPING_TIMEOUT + 5000);
    } else if (!typing && state.active) {
      // We were typing
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      state.active = false;
      synapseService.getClient().sendTyping(this.id, false);
    }
  }

  //* *******************************************************************************
  // Helpers
  //* *******************************************************************************
  getAvatarUrl(size) {
    if (this.avatar$.getValue() == null) return null;
    try {
      return synapseService.getImageUrl(this.avatar$.getValue(), size, size, 'crop');
    } catch (e) {
      console.log('Error in getAvatarUrl', e);
      return null;
    }
  }
}
