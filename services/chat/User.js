import { BehaviorSubject } from 'rxjs';

import synapseService from '../auth/synapseService';

export default class User {
  constructor(userId, matrixUser) {
    this.id = this.key = userId;

    if (!matrixUser) {
      this._matrixUser = synapseService.getClient().getUser(userId);
    } else this._matrixUser = matrixUser;

    if (this._matrixUser) {
      this.name$ = new BehaviorSubject(this._matrixUser.displayName || userId);
      this.avatar$ = new BehaviorSubject(this._matrixUser.avatarUrl);
    } else {
      this.name$ = new BehaviorSubject(userId);
      this.avatar$ = new BehaviorSubject(null);
    }
  }

  //* *******************************************************************************
  // Data
  //* *******************************************************************************
  update() {
    const newName = this._matrixUser?.displayName || this.id;
    if (this.name$.getValue() !== newName) this.name$.next(newName);

    const newAvatar = this._matrixUser.avatarUrl;
    if (this.avatar$.getValue() !== newAvatar) this.avatar$.next(newAvatar);
  }

  //* *******************************************************************************
  // Actions
  //* *******************************************************************************
  async setAvatar(image) {
    const url = await synapseService.uploadImage(image);
    return synapseService.getClient().setAvatarUrl(url);
  }

  async setName(name) {
    return synapseService.getClient().setDisplayName(name);
  }

  //* *******************************************************************************
  // Helpers
  //* *******************************************************************************
  isMatrixUser(matrixUser) {
    if (this.id !== matrixUser.userId) return false;

    if (
      (matrixUser.displayName && matrixUser.displayName !== this.name$.getValue()) ||
      (!matrixUser.displayName && matrixUser.userId !== this.name$.getValue())
    ) {
      return false;
    }

    if (matrixUser.avatarUrl !== this.avatar$.getValue()) {
      return false;
    }

    return true;
  }
}
