import { InteractionManager } from 'react-native';
import { BehaviorSubject } from 'rxjs';

import synapseService from '../auth/synapseService';
import { route$ } from '../navigation/navigationService';
import Chat, { ChatDetails } from './Chat';
import Message from './Message';
import messageService from './messageService';

class ChatService {
  constructor() {
    this._chats = {
      all: {},
      direct$: new BehaviorSubject([]),
      group$: new BehaviorSubject([]),
    };
    this._syncList = {};
    this._opened = null;
    this._initialSync = true;

    synapseService.isReady$().subscribe((isReady) => {
      if (isReady) this._listen();
    });

    synapseService.isSynced$().subscribe((isSynced) => {
      if (isSynced) this._catchup();
    });

    route$.subscribe((route) => {
      if (route) {
        if (route.name === 'Chat') {
          this._setOpened(route.params.roomId);
        } else if (route.name === 'ChatsList') {
          this._setOpened('all');
        } else {
          this._setOpened(null);
        }
      }
    });
  }

  getListByType$(type) {
    if (type === 'direct') return this._chats.direct$;
    return this._chats.group$;
  }

  getDirectChatsMembers() {
    const members = [];
    const prevChats = Object.keys(this._chats.all);
    if (prevChats.length > 0) {
      for (const roomId of prevChats) {
        members.push({
          name: this._chats.all[roomId].name$.getValue(),
          roomId,
        });
      }
    }
    return members;
  }

  getChatById(roomId) {
    if (!this._chats.all[roomId]) {
      const synapseRoom = synapseService.getClient().getRoom(roomId);
      this._chats.all[roomId] = new Chat(roomId, synapseRoom);
    }
    return this._chats.all[roomId];
  }

  async updateLists(updateChats = false) {
    return InteractionManager.runAfterInteractions(() => {
      let synapseRooms = [];
      const chats = [];
      const directChats = [];
      const groupChats = [];

      const prevChats = Object.keys(this._chats.all);

      try {
        synapseRooms = synapseService.getClient().getRooms();
      } catch (e) {
        console.log('Error in getListByType', e.message);
      }

      for (const synapseRoom of synapseRooms) {
        let chat = this._chats.all[synapseRoom.roomId];
        if (!chat) {
          chat = new Chat(synapseRoom.roomId, synapseRoom);
          this._chats.all[synapseRoom.roomId] = chat;
        } else if (updateChats) {
          chat.update(ChatDetails.SUMMARY);
        }
        chats.push(chat);
        if (chat.isDirect$.getValue()) directChats.push(chat);
        else groupChats.push(chat);

        const prevChatIndex = prevChats.find((roomId) => roomId === chat.id);
        if (prevChatIndex !== -1) prevChats.splice(prevChatIndex, 1);
      }

      directChats.sort(this.sortChatsByLastMessage);
      groupChats.sort(this.sortChatsByLastMessage);

      if (!this.isEqualById(directChats, this._chats.direct$.getValue())) {
        this._chats.direct$.next(directChats);
      }
      if (!this.isEqualById(groupChats, this._chats.group$.getValue())) {
        this._chats.group$.next(groupChats);
      }

      if (prevChats.length > 0) {
        for (const roomId of prevChats) {
          delete this._chats.all[roomId];
        }
      }
    });
  }

  async _catchup() {
    for (const chat of Object.values(this._chats.all)) {
      await chat.sendPendingEvents();
    }
  }

  _handleAccountDataEvent(event) {
    if (this._isNotSubscribedTo('all')) return;

    switch (event.getType()) {
      case 'm.direct':
        for (const roomId of Object.keys(this._chats.all)) {
          if (!this._syncList[roomId]) this._syncList[roomId] = {};
          this._syncList[roomId].direct = true;
        }
        break;
      default:
    }
  }

  _handleDeleteRoomEvent(roomId) {
    if (this._syncList[roomId]) delete this._syncList[roomId];
    this.updateLists();
  }

  _handleRoomLocalEchoUpdatedEvent(event, synapseRoom, oldEventId) {
    const roomId = synapseRoom.roomId;
    if (!this._isChatDisplayed(roomId)) return;

    if (
      !oldEventId &&
      event.getType() === 'm.room.message' &&
      event.getContent().msgtype === 'm.image' &&
      this._chats.all[roomId]
    ) {
      const filename = event.getContent().body;
      this._chats.all[roomId].removePendingMessage(`~~${roomId}:${filename}`);
    }

    if (oldEventId && oldEventId === event.getId()) {
      messageService.updateMessage(oldEventId, roomId);
    }

    if (!oldEventId && Message.isMessageUpdate(event)) {
      let mainEventId = event.getAssociatedId();
      const relatedEvent = synapseRoom.findEventById(mainEventId);

      if (Message.isMessageUpdate(relatedEvent)) {
        mainEventId = relatedEvent.getAssociatedId();
      }
      messageService.updateMessage(mainEventId, roomId);
    }

    this._chats.all[roomId].update({ timeline: true });
  }

  _handleRoomReceiptEvent(event, synapseRoom) {
    const roomId = synapseRoom.roomId;
    if (!this._isChatDisplayed(roomId)) return;

    if (this._chats.all[roomId] && this._chats.all[roomId].isDirect$.getValue()) {
      if (!this._syncList[roomId]) this._syncList[roomId] = {};
      this._syncList[roomId].receipt = true;
    }
  }

  _handleRoomTimelineEvent(event, synapseRoom) {
    console.log('eveveve', event);
    const roomId = synapseRoom.roomId;
    if (!this._isChatDisplayed(roomId)) return;
    console.log(1);
    if (!this._syncList[roomId]) this._syncList[roomId] = {};
    this._syncList[roomId].timeline = true;
    console.log(2, this._syncList[roomId]);
    // If this event updates a message's content or relations
    if (Message.isMessageUpdate(event)) {
      console.log(3);
      let mainEventId = event.getAssociatedId();
      const relatedEvent = synapseRoom.findEventById(mainEventId);
      if (!relatedEvent) return;
      // If this is a redaction, it could redact another relation so we need to
      // fetch the main event
      if (Message.isMessageUpdate(relatedEvent)) {
        console.log(4);
        // We need to look for the eventIds in memory because the associated id
        // has been redacted too
        const mainMessage = messageService.getMessageByRelationId(relatedEvent.getId(), roomId);
        if (!mainMessage) return;
        mainEventId = mainMessage.id;
      }
      if (!this._syncList[roomId].messages) this._syncList[roomId].messages = {};
      this._syncList[roomId].messages[mainEventId] = true;
      console.log(4, this._syncList[roomId]);
    }
  }

  _handleRoomMemberTypingEvent(event, synapseMember) {
    const roomId = synapseMember.roomId;
    if (!this._isChatDisplayed(roomId)) return;

    if (!this._syncList[roomId]) this._syncList[roomId] = {};
    this._syncList[roomId].typing = event.getContent().user_ids;
  }

  _handleRoomStateEvent(event, synapseRoomState) {
    const roomId = synapseRoomState.roomId;
    if (!this._isChatDisplayed(roomId)) return;

    if (!this._syncList[roomId]) this._syncList[roomId] = {};
    this._syncList[roomId].state = true;
  }

  _isChatDisplayed(chat) {
    if (this._opened === 'all') return true;
    if (this._opened === chat) return true;
    return false;
  }

  _listen() {
    synapseService.getClient().on('accountData', (event) => this._handleAccountDataEvent(event));
    synapseService.getClient().on('deleteRoom', (roomId) => this._handleDeleteRoomEvent(roomId));
    synapseService
      .getClient()
      .on('Room.localEchoUpdated', (event, room, oldEventId, oldStatus) =>
        this._handleRoomLocalEchoUpdatedEvent(event, room, oldEventId, oldStatus),
      );
    synapseService.getClient().on('Room.receipt', (event, room) => this._handleRoomReceiptEvent(event, room));
    synapseService.getClient().on('Room.timeline', (event, room) => this._handleRoomTimelineEvent(event, room));
    synapseService
      .getClient()
      .on('RoomMember.typing', (event, member) => this._handleRoomMemberTypingEvent(event, member));
    synapseService
      .getClient()
      .on('RoomState.events', (event, roomState) => this._handleRoomStateEvent(event, roomState));

    synapseService.getClient().on('sync', (state) => {
      if (['PREPARED', 'SYNCING'].includes(state)) {
        InteractionManager.runAfterInteractions(this._syncChats.bind(this));
      }
    });
  }

  _setOpened(chat) {
    if (this._opened !== chat) {
      if (this._opened && this._opened !== 'all') {
        this._chats.all[this._opened].setTyping(false);
      }

      if (chat === 'all') {
        this.updateLists(true);
      } else if (chat) {
        this._chats.all[chat].update(ChatDetails.ALL);
      }
      this._opened = chat;
    }
  }

  async _syncChats() {
    for (const [roomId, changes] of Object.entries(this._syncList)) {
      if (!this._chats.all[roomId]) {
        this._chats.all[roomId] = new Chat(roomId);
      } else if (this._chats.all[roomId]) {
        this._chats.all[roomId].update(changes);
      }
    }
    if (this._initialSync || (this._isChatDisplayed('all') && Object.keys(this._syncList).length > 0)) {
      this._initialSync = false;
      await this.updateLists();
    }
    this._syncList = {};
  }

  //* *******************************************************************************
  // Helpers
  //* *******************************************************************************
  async createChat(options) {
    try {
      if (!options) {
        throw new Error('Incorrect Payload');
      }
      const list = this.getDirectChatsMembers();
      let alreadyExists = false;
      if (options.invite && list.length) {
        alreadyExists = list.find(({ name, roomId }) => name.indexOf(options.invite) !== -1);
      }

      if (alreadyExists) {
        return alreadyExists;
      }

      const response = await synapseService.getClient().createRoom(options);
      const synapseRoom = synapseService.getClient().getRoom(response.room_id);

      return {
        roomId: synapseRoom.roomId,
        name: synapseRoom.name,
      };
    } catch (e) {
      console.log('Error creating chat:', e);
      return { error: true };
    }
  }

  getAvatarUrl(mxcUrl, size) {
    if (mxcUrl == null) return null;
    try {
      return synapseService.getImageUrl(mxcUrl, size, size, 'crop');
    } catch (e) {
      console.log('Error in getAvatarUrl:', e);
      return null;
    }
  }

  sortChatsByLastMessage(chatA, chatB) {
    const latestA = messageService.getMessageById(chatA.messages$.getValue()[0], chatA.id)?.timestamp;
    const latestB = messageService.getMessageById(chatB.messages$.getValue()[0], chatB.id)?.timestamp;
    return latestA && latestB && latestA > latestB ? -1 : latestA < latestB ? 1 : 0;
  }

  isEqualById(a, b) {
    if ((!a || !b) && a !== b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].id !== b[i].id) return false;
    }
    return true;
  }
}

const chatService = new ChatService();
export default chatService;
