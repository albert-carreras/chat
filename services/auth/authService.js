import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import synapse from './synapseService';
import AsyncStorage from '@react-native-community/async-storage';
import navigationService from '../navigation/navigationService';

const initialAuthData = {
  userId: null,
  accessToken: null,
};

class AuthService {
  _data$;
  _isLoaded$;
  _isSyncing;

  constructor() {
    this._data$ = new BehaviorSubject(initialAuthData);
    this._isLoaded$ = new BehaviorSubject(false);
    this._isSyncing = false;
  }
  async init() {
    this._isSyncing = true;
    const jsonData = await AsyncStorage.getItem('auth');
    const cleanData = this._sanitizeData(JSON.parse(jsonData));
    this._data$.next(cleanData);
    this._isLoaded$.next(true);
    this._isSyncing = false;

    synapse.isReady$().subscribe((isReady) => {
      if (isReady) {
        synapse.getClient()?.on('Session.logged_out', (e) => {
          console.log('Logged out from the client', e);
          this.logout();
        });
      }
    });

    this.loginWithStoredCredentials();
  }

  getData$() {
    return this._data$;
  }

  getUserId() {
    return this._data$.getValue().userId;
  }

  isLoaded$() {
    return this._isLoaded$;
  }

  isLoggedIn$() {
    return this._data$.pipe(map((data) => data.userId && data.accessToken));
  }

  async _setData(data) {
    if (this._isSyncing) console.log('A storage interaction is already running');
    this._isSyncing = true;
    const cleanData = this._sanitizeData(data);
    this._data$.next(cleanData);
    await AsyncStorage.setItem('auth', JSON.stringify(cleanData));
    this._isSyncing = false;
  }

  async _reset() {
    await this._setData(initialAuthData);
  }

  _sanitizeData(data) {
    return {
      userId: data?.userId,
      accessToken: data?.accessToken,
    };
  }

  async loginWithPassword(username, password) {
    try {
      const user = username;
      console.log('Logging in as %s on %s', user);
      await synapse.createClient();
      const response = await synapse.getClient()?.loginWithPassword(user, password);

      synapse.start();

      const data = {
        userId: response.user_id,
        accessToken: response.access_token,
      };
      await this._setData(data);

      return data;
    } catch (e) {
      console.log('Error logging in:', e);
      const data = {};
      if (e.errcode) {
        // Matrix errors
        data.error = e.errcode;
        switch (e.errcode) {
          case 'M_FORBIDDEN':
            data.message = 'Forbidden :(';
            break;
          case 'M_USER_DEACTIVATED':
            data.message = 'User Deactivated :(';
            break;
          case 'M_LIMIT_EXCEEDED':
            data.message = 'Limit Exceeded :(';
            break;
          default:
            data.message = 'Unknown Error :(';
        }
      } else {
        // Connection error
        data.error = 'NO_RESPONSE';
        data.message = 'Connection Error :(';
      }
      return data;
    }
  }

  async loginWithStoredCredentials() {
    try {
      const { userId, accessToken } = this._data$.getValue();
      if (!userId || !accessToken) {
        return {
          error: 'NO_STORED_CREDENTIALS',
        };
      }
      console.log('Logging in as %s on %s', userId);
      await synapse.createClient(userId, accessToken);

      synapse.start();

      return {
        userId,
        accessToken,
      };
    } catch (e) {
      console.log('Error logging in:', e);
      const login = {};
      if (e.errcode) {
        login.error = e.errcode;
        switch (e.errcode) {
          case 'M_UNKNOWN_TOKEN':
            synapse.stop();
            break;
          default:
            console.log('unknow?');
        }
      } else {
        login.error = 'NO_ERRCODE';
      }
      return login;
    }
  }

  async logout() {
    try {
      await this._reset();
      await synapse.stop();
    } catch (e) {
      console.log('Error logging out', e);
    }
  }
}

const authService = new AuthService();
export default authService;
