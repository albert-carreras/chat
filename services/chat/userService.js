import { InteractionManager } from 'react-native';

import synapseService from '../auth/synapseService';
import User from './User';

class UserService {
  constructor() {
    this._myUser = null;
    this._users = {};
    this._syncList = {};

    synapseService.isReady$().subscribe((isReady) => {
      if (isReady) this._listen();
    });
  }

  //* *******************************************************************************
  // Data
  //* *******************************************************************************
  getMyUser() {
    if (!this._myUser) {
      try {
        const matrixUser = synapseService.getClient().getUser(synapseService.getClient().getUserId());
        const user = new User(matrixUser.userId, matrixUser);
        this._users[matrixUser.userId] = user;
        this._myUser = user;
      } catch (e) {
        console.log('Error in getMyUser', e);
      }
    }

    return this._myUser;
  }

  getUserById(userId) {
    if (!this._users[userId]) {
      this._users[userId] = new User(userId);
    }
    return this._users[userId];
  }

  _handleRoomStateEvent(event) {
    if (event.getType() === 'm.room.member') {
      const userId = event.getStateKey();
      const newContent = event.getContent();
      const prevContent = event.getPrevContent();
      if (newContent.avatar_url !== prevContent.avatar_url) {
        const matrixUser = synapseService.getClient().getUser(userId);

        // We need to update the avatar manually when the avatar has been removed
        // because somehow the sdk doesn't
        if (matrixUser.avatarUrl !== newContent.avatar_url) {
          matrixUser.setAvatarUrl(newContent.avatar_url);
        }

        this._syncList[userId] = true;
      } else if (newContent.displayname !== prevContent.displayname) {
        this._syncList[userId] = true;
      }
    }
  }

  _listen() {
    synapseService
      .getClient()
      .on('RoomState.events', (event, roomState) => this._handleRoomStateEvent(event, roomState));

    synapseService.getClient().on('sync', (state) => {
      if (['PREPARED', 'SYNCING'].includes(state)) {
        InteractionManager.runAfterInteractions(this._syncUsers.bind(this));
      }
    });
  }

  _syncUsers() {
    for (const userId of Object.keys(this._syncList)) {
      if (this._users[userId]) this._users[userId].update();
    }
    this._syncList = {};
  }

  //* *******************************************************************************
  // Helpers
  //* *******************************************************************************
  getAvatarUrl(url) {
    return synapseService.getImageUrl(url, 150, 150, 'crop');
  }

  getKnownUsers() {
    const knownUsers = [];

    for (const matrixUser of synapseService.getClient().getUsers()) {
      knownUsers.push({
        id: matrixUser.userId,
        name: matrixUser.displayName,
        avatar: matrixUser.avatarUrl,
      });
    }

    return knownUsers;
  }

  async searchUsers(searchText) {
    try {
      const { results: userList } = await synapseService.getClient().searchUserDirectory({
        term: searchText,
      });
      const cleanUserList = [];

      for (const user of userList) {
        // We need to remove duplicates and our own user
        if (
          user.user_id !== synapseService.getClient().getUserId() &&
          cleanUserList.findIndex((cleanUser) => cleanUser.id === user.user_id) === -1
        ) {
          cleanUserList.push({
            id: user.user_id,
            name: user.display_name,
            avatar: user.avatar_url,
          });
        }
      }
      return cleanUserList;
    } catch (e) {
      console.log('Error searching user directory', e);
    }
  }
}

const userService = new UserService();
export default userService;
