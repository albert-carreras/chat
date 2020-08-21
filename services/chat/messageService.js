import synapseService from '../auth/synapseService';
import Message from './Message';

class MessageService {
  constructor() {
    this._messages = {};
  }

  //* *******************************************************************************
  // Data
  //* *******************************************************************************
  cleanupRoomMessages(roomId, messageList) {
    if (!this._messages[roomId]) return;

    for (const eventId of Object.keys(this._messages[roomId])) {
      if (!messageList.includes(eventId)) delete this._messages[roomId][eventId];
    }
  }

  getMessageById(eventId, roomId, event, pending = false) {
    if (!this._messages[roomId]) this._messages[roomId] = {};
    if (!this._messages[roomId][eventId]) {
      if (eventId) {
        this._messages[roomId][eventId] = new Message(eventId, roomId, event, pending);
      }
    }
    return this._messages[roomId][eventId];
  }

  getMessageByRelationId(eventId, roomId) {
    if (!this._messages[roomId]) return;

    for (const message of Object.values(this._messages[roomId])) {
      // Look in reactions
      const reactions = message.reactions$.getValue();
      if (reactions) {
        for (const userEvents of Object.values(reactions)) {
          const reaction = Object.values(userEvents).find((event) => event.eventId === eventId);
          if (reaction) return message;
        }
      }
    }
  }

  subscribe(target) {
    this._subscription = target;
  }

  updateMessage(eventId, roomId) {
    if (!this._messages[roomId] || !this._messages[roomId][eventId]) return;

    this._messages[roomId][eventId].update();
  }

  updateRoomMessages(roomId) {
    if (!this._messages[roomId]) return;

    for (const message of Object.values(this._messages[roomId])) {
      message.update();
    }
  }

  //* *******************************************************************************
  // Helpers
  //* *******************************************************************************

  async send(content, type, roomId) {
    try {
      switch (type) {
        case 'm.text': {
          return synapseService.getClient().sendTextMessage(roomId, content);
        }
        case 'm.image': {
          return synapseService.getClient().sendImageMessage(
            roomId,
            content.url,
            {
              w: content.width,
              h: content.height,
              mimetype: content.type,
              size: content.fileSize,
            },
            content.fileName,
          );
        }
        default:
          console.log('Unhandled message type to send %s:', type, content);
          return;
      }
    } catch (e) {
      console.log('Error sending message:', { roomId, type, content }, e);
    }
  }

  sortByLastSent(messages) {
    const sorted = [...messages];
    sorted.sort((a, b) => {
      return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0;
    });
    return sorted;
  }
}

const messageService = new MessageService();
export default messageService;
