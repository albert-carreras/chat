import isEqual from 'lodash.isequal';
import { EventStatus } from 'matrix-js-sdk';
import { BehaviorSubject } from 'rxjs';

import users from './userService';
import synapseService from '../auth/synapseService';

// This is to add our own statuses on top of matrix's
export const MessageStatus = {
  ...EventStatus,
  // The content of the message (file) is uploading
  UPLOADING: 'uploading',
  // The content of the message could not be uploaded
  NOT_UPLOADED: 'not_uploaded',
};

export default class Message {
  constructor(eventId, roomId, event, pending = false) {
    this.id = this.key = eventId;
    this.roomId = roomId;

    if (!pending) {
      if (!event) {
        if (roomId) {
          const room = synapseService.getClient().getRoom(roomId);
          const roomEvents = room.getLiveTimeline().getEvents();
          const roomEvent = roomEvents.find((event) => event.getId() === eventId);
          if (roomEvent) {
            this._matrixEvent = roomEvent;
          } else if (room.hasPendingEvent(eventId)) {
            const pendingEvents = room.getPendingEvents();
            this._matrixEvent = pendingEvents.find((event) => event.getId() === eventId);
          }
        }
        if (!this._matrixEvent) {
          throw Error(`No event in room ${roomId} with id ${eventId}`);
        }
      } else this._matrixEvent = event;

      this.type = Message.getType(this._matrixEvent);
      this.sender = users.getUserById(this._matrixEvent.getSender());
      this.timestamp = this._matrixEvent.getTs();
      this.status$ = new BehaviorSubject(this._matrixEvent.getAssociatedStatus());
      this.redacted$ = new BehaviorSubject(this._matrixEvent.isRedacted());
      this.content$ = new BehaviorSubject(this._getContent());
      this.reactions$ = new BehaviorSubject(this._getReactions());
    } else {
      if (!event) throw Error(`All local messages should have an event (${this.id})`);

      this.pending = true;
      this._localEvent = event;

      this.type = event.type;
      this.sender = users.getMyUser();
      this.timestamp = event.timestamp;
      this.status$ = new BehaviorSubject(event.status);
      this.redacted$ = new BehaviorSubject(null);
      this.content$ = new BehaviorSubject(this._getContent());
      this.reactions$ = new BehaviorSubject(null);
    }
  }

  //* *******************************************************************************
  // Data
  //* *******************************************************************************
  async addReaction(key) {
    try {
      const reaction = {
        'm.relates_to': {
          rel_type: 'm.annotation',
          event_id: this.id,
          key: key,
        },
      };
      await synapseService.getClient().sendEvent(this.roomId, 'm.reaction', reaction);
      this.update();
    } catch (e) {
      console.warn('Error sending reaction: ', { message: this, key }, e);
    }
  }

  async removeReaction(key) {
    try {
      const reactions = this.reactions$.getValue();
      const eventId = reactions[key][synapseService.getClient().getUserId()].eventId;
      await synapseService.getClient().redactEvent(this.roomId, eventId);
      this.update();
    } catch (e) {
      console.warn('Error removing reaction: ', { message: this, key }, e);
    }
  }

  async toggleReaction(key) {
    try {
      const reactions = this.reactions$.getValue();
      const reaction = reactions[key][synapseService.getClient().getUserId()];
      if (reaction) return this.removeReaction(key);
      else return this.addReaction(key);
    } catch (e) {
      if (this.addReaction) {
        this.addReaction(key);
      } else {
        console.warn(e);
      }
    }
  }

  update(changes) {
    if (!this.pending) {
      const newRedacted = this._matrixEvent.isRedacted();
      if (this.redacted$.getValue() !== newRedacted) this.redacted$.next(newRedacted);

      const newStatus = this._matrixEvent.getAssociatedStatus();
      if (this.status$.getValue() !== newStatus) {
        this.status$.next(newStatus);
      }

      const newContent = this._getContent();
      if (!isEqual(this.content$.getValue(), newContent)) {
        this.content$.next(newContent);
      }

      const newReactions = this._getReactions();
      if (!isEqual(this.reactions$.getValue(), newReactions)) {
        this.reactions$.next(newReactions);
      }
    } else {
      if (changes.status && this.status$.getValue() !== changes.status) {
        this.status$.next(changes.status);
      }
    }
  }

  _getContent() {
    const content = {};
    if (this.pending) {
      content.raw = this._localEvent.content;
    } else {
      content.raw = this._matrixEvent.getContent();
    }
    if (this.redacted$.getValue()) {
      content.text = 'Redacted';
      return content;
    }
    const sender = this.sender.name$.getValue();

    switch (this.type) {
      // TextMessage && NoticeMessage
      case 'm.text':
      case 'm.notice':
        content.text = content.raw.body;
        if (content.raw.format === 'org.synapseService.custom.html') {
          content.html = content.raw.formatted_body;
        } else {
          content.html = content.raw.body;
        }
        break;
      // ImageMessage
      case 'm.image': {
        content.text = 'Image Sent';

        if (this.pending) {
          content.full = {
            width: content.raw.width,
            height: content.raw.height,
            url: content.raw.uri,
          };
          content.thumb = {
            url: content.full.url,
          };
        }
        // else {
        //   content.full = {
        //     height: content.raw.info.h,
        //     width: content.raw.info.w,
        //     url: synapseService.getImageUrl(content.raw.url),
        //   };
        //   content.thumb = {
        //     url: synapseService.getImageUrl(content.raw.url, 72, 72),
        //   };
        // }
        // // TODO: different sizes in constants or something
        // const { height, width } = content.full;
        // if (width > height) {
        //   content.thumb.height = (height * 72) / width;
        //   content.thumb.width = 72;
        // } else {
        //   content.thumb.height = 72;
        //   content.thumb.width = (width * 72) / height;
        // }
        break;
      }
      // EventMessages
      // Unsupported for now
      case 'm.audio':
        content.text = 'messages:content.audioNotSupport';
        break;
      case 'm.video':
        content.text = 'messages:content.videoFilesNotSupport';
        break;
      case 'm.file':
        content.text = 'messages:content.fileSharingNotSupport';
        break;
      case 'm.location':
        content.text = 'messages:content.locationSharingNotSupport';
        break;
      case 'm.sticker':
        content.text = 'messages:content.stickersNotSupport';
        break;
      case 'm.room.encrypted':
        content.text = 'messages:content.encryptNotSupport';
        break;
      // Supported
      case 'm.emote':
        content.text = `${sender} ${content.raw.body}`;
        break;
      case 'm.room.member': {
        const prevContent = this._matrixEvent.getPrevContent();
        if (prevContent.membership !== content.raw.membership) {
          switch (content.raw.membership) {
            case 'invite':
              content.text = 'messages:content.memberInvited';
              break;
            case 'join':
              content.text = 'messages:content.memberJoined';
              break;
            case 'leave':
              content.text = 'messages:content.memberLeft';
              break;
            default:
              content.text = 'messages:content.membershipNotSupport';
              break;
          }
        } else if (prevContent.avatar_url !== content.raw.avatar_url) {
          if (!content.raw.avatar_url) content.text = 'messages:content.memberAvatarRemoved';
          else content.text = 'messages:content.memberAvatarChanged';
        } else if (prevContent.displayname !== content.raw.displayname) {
          const prevSender = prevContent.displayname || this.sender.id;
          const newSender = content.raw.displayname || this.sender.id;
          content.text = 'messages:content.memberDisplayNameChanged';
        }
        break;
      }
      case 'm.room.third_party_invite':
        content.text = 'messages:content.thirdPartyInvite';
        break;
      case 'm.room.create':
        content.text = 'messages:content.chatCreated';
        break;
      case 'm.room.name':
        content.text = 'messages:content.chatNameChanged';
        break;
      case 'm.room.avatar':
        content.text = 'messages:content.chatAvatarChanged';
        break;
      case 'm.room.topic':
        content.text = 'messages:content.chatDescriptionChanged';
        break;
      case 'm.room.encryption':
      case 'm.room.guest_access':
      case 'm.room.history_visibility':
      case 'm.room.join_rules':
      case 'm.room.power_levels':
        content.text = 'messages:content.chatSettingsChanged';
        break;
      default:
        content.text = 'messages:content.typeNotSupport';
        break;
    }
    return content;
  }

  _getReactions() {
    const room = synapseService.getClient().getRoom(this.roomId);
    // const eventReactions = room.getUnfilteredTimelineSet().getRelationsForEvent(this.id, 'm.annotation', 'm.reaction');
    // const sortedReactions = eventReactions?.getSortedAnnotationsByKey();
    const sortedReactions = false;
    if (sortedReactions && sortedReactions.length > 0) {
      const reactions = {};
      for (const [key, events] of sortedReactions) {
        if (events.size > 0) {
          const users = {};
          for (const event of events) {
            users[event.getSender()] = {
              eventId: event.getId(),
              timestamp: event.getTs(),
            };
          }
          reactions[key] = users;
        }
      }
      if (Object.keys(reactions).length === 0) return;
      return reactions;
    }
  }

  //* *******************************************************************************
  // Helpers
  //* *******************************************************************************
  getMatrixEvent() {
    return this._matrixEvent;
  }

  static getType(matrixEvent) {
    const type = matrixEvent.getType();
    if (matrixEvent.isRedacted()) {
      return type;
    }
    if (type === 'm.room.message') {
      return matrixEvent.getContent().msgtype;
    }
    return type;
  }

  static isBubbleMessage(message) {
    if (
      Message.isTextMessage(message.type) ||
      Message.isImageMessage(message.type) ||
      Message.isNoticeMessage(message.type)
    ) {
      return true;
    }
  }

  static isEventDisplayed(matrixEvent) {
    const type = Message.getType(matrixEvent);
    if (Message.isMessageUpdate(matrixEvent)) {
      return false;
    }
    if (
      Message.isTextMessage(type) ||
      Message.isEventMessage(type) ||
      Message.isImageMessage(type) ||
      Message.isNoticeMessage(type)
    ) {
      return true;
    }
    // To console.log unhandled types
    switch (type) {
      default:
        console.log('Unhandled matrix event type "%s"', type, matrixEvent);
        return true;
    }
  }

  static isEventMessage(type) {
    switch (type) {
      case 'm.emote':
      case 'm.room.member':
      case 'm.room.create':
      case 'm.room.name':
      case 'm.room.avatar':
      case 'm.room.topic':
      case 'm.room.encryption':
      case 'm.room.guest_access':
      case 'm.room.history_visibility':
      case 'm.room.join_rules':
      case 'm.room.power_levels':
      case 'm.room.message':
      case 'm.room.third_party_invite':
        return true;
      // Below are other messages unsupported for now but still displayed as events
      case 'm.audio':
      case 'm.video':
      case 'm.file':
      case 'm.location':
      case 'm.sticker':
      case 'm.room.encrypted':
        return true;
      default:
        return false;
    }
  }

  static isImageMessage(type) {
    if (type === 'm.image') return true;
    return false;
  }

  static isMessageUpdate(matrixEvent) {
    if (matrixEvent.isRedaction()) return true;
    if (matrixEvent.getType() === 'm.reaction') return true;

    if (matrixEvent.getType() === 'm.room.message') {
      const content = matrixEvent.getContent();
      if (content['m.relates_to'] && content['m.relates_to'].rel_type === 'm.replace') {
        return true;
      }
    }
    return false;
  }

  static isNoticeMessage(type) {
    if (type === 'm.notice') return true;
    return false;
  }

  static isTextMessage(type) {
    if (type === 'm.text') return true;
    return false;
  }
}
