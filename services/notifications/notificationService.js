import { Platform } from 'react-native';
import { BehaviorSubject } from 'rxjs';
import { Buffer } from 'buffer';
import * as firebase from 'firebase';

import synapseService from '../auth/synapseService';
import { route$ } from '../navigation/navigationService';

const MATRIX_PUSH_GATEWAY_APNS = '';
const MATRIX_PUSH_GATEWAY_FCM = '';
const MATRIX_PUSH_GATEWAY_URL = '';

const firebaseConfig = {
  apiKey: 'api-key',
  authDomain: 'project-id.firebaseapp.com',
  databaseURL: 'https://project-id.firebaseio.com',
  projectId: 'project-id',
  storageBucket: 'project-id.appspot.com',
  messagingSenderId: 'sender-id',
  appId: 'app-id',
  measurementId: 'G-measurement-id',
};

const isIos = Platform.OS !== 'android';

export default class NotificationService {
  _token$: BehaviorSubject<null>;

  constructor() {
    this._token$ = new BehaviorSubject(null);
  }

  async init() {
    synapseService.isReady$().subscribe((isReady) => {
      if (!isReady) {
        return;
      }
    });

    route$.subscribe((route) => {
      if (route && route.name === 'Chat' && route.params.roomId) {
        this.cancelByRoom(route.params.roomId);
      }
    });

    let token;
    // if (Constants.isDevice) {
    //   const { status: existingStatus } = await Permissions.getAsync(Permissions.NOTIFICATIONS);
    //   let finalStatus = existingStatus;
    //   if (existingStatus !== 'granted') {
    //     const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
    //     finalStatus = status;
    //   }
    //   if (finalStatus !== 'granted') {
    //     alert('Failed to get push token for push notification!');
    //     return;
    //   }
    //   token = (await Notifications.getExpoPushTokenAsync()).data;
    // } else {
    //   alert('Must use physical device for Push Notifications');
    // }
    //
    // if (!isIos) {
    //   await Notifications.setNotificationChannelAsync('default', {
    //     name: 'default',
    //     importance: Notifications.AndroidImportance.MAX,
    //     vibrationPattern: [0, 250, 250, 250],
    //     lightColor: '#FF231F7C',
    //   });
    // }
    if (token) {
      this._token$.next(token);
      const pusherExists = await this._hasPusher(token);
      if (!pusherExists) {
        await this._setPusher(token);
      }
    }
  }

  cancelByRoom(roomId) {
    if (!roomId || roomId === '') {
      throw Error('No roomId set');
    }
  }

  async _hasPusher(token) {
    const { pushers } = await synapseService.getClient().getPushers();

    let pushkey = token;
    let appId = null;
    if (isIos) {
      appId = MATRIX_PUSH_GATEWAY_APNS;
      pushkey = Buffer.from(token, 'hex').toString('base64');
    } else {
      appId = MATRIX_PUSH_GATEWAY_FCM;
    }

    for (const pusher of pushers) {
      if (pusher.app_id === appId && pusher.pushkey === pushkey && pusher.data.url === MATRIX_PUSH_GATEWAY_URL) {
        return true;
      }
    }
    return false;
  }

  async _setPusher(token, enable = true) {
    let appId = null;
    let pushkey = token;
    if (isIos) {
      appId = MATRIX_PUSH_GATEWAY_APNS;
      // Convert to base64 since that's what sygnal expects
      pushkey = Buffer.from(token, 'hex').toString('base64');
    } else {
      appId = MATRIX_PUSH_GATEWAY_FCM;
    }

    const pusher = {
      lang: 'en',
      kind: enable ? 'http' : null,
      app_display_name: Constants.name,
      device_display_name: Constants.deviceName,
      app_id: appId,
      pushkey,
      data: {
        url: MATRIX_PUSH_GATEWAY_URL,
        format: 'event_id_only',
      },
      append: false,
    };

    try {
      console.log('Setting Pusher:', pusher);
      const response = await synapseService.getClient().setPusher(pusher);
      console.log('Pusher response: ', response);
      if (Object.keys(response).length > 0) {
        console.log('Error registering pusher on matrix homeserver:', response);
      }
    } catch (e) {
      console.log('Error registering pusher on matrix homeserver:', e);
      throw e;
    }
  }
  async disableAll() {
    Notifications.removeAllNotificationListeners();
    Notifications.removeAllPushTokenListeners();
    this._setPusher(this._token$.getValue(), false);
  }
}
