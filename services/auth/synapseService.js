import { BehaviorSubject } from 'rxjs';
import sdk from 'matrix-js-sdk';

class SynapseService {
  client;
  started;
  _isSynced$;
  _error$;
  _isReady$;

  constructor() {
    this.client = null;
    this.started = false;
    this._isReady$ = new BehaviorSubject(false);
    this._isSynced$ = new BehaviorSubject(false);
    this._error$ = new BehaviorSubject(null);
  }

  getClient() {
    if (!this.client) {
      throw Error('getClient: No matrix client');
    }
    return this.client;
  }

  getError() {
    return this._error$;
  }

  hasClient() {
    return !!this.client;
  }

  isReady$() {
    return this._isReady$;
  }

  isSynced$() {
    return this._isSynced$;
  }

  async createClient(userId = null, accessToken = null) {
    if (this.client && this.client.getUserId() === userId && this.client.getAccessToken() === accessToken) {
      console.log('alreayd exists');
      return;
    }
    this.stop();
    if (!userId || !accessToken) {
      this.client = sdk.createClient('https://acarreras.dev');
      return;
    }

    this.client = sdk.createClient({
      baseUrl: 'https://acarreras.dev',
      userId,
      accessToken,
    });
  }

  async start() {
    if (!this.client) {
      console.log('no client');
      return null;
    }
    if (this.started) {
      console.log('start: already started.');
      return null;
    }

    this.client.on('sync', this._onSyncEvent.bind(this));
    this.client.startClient({
      initialSyncLimit: 8,
      lazyLoadMembers: true,
      pendingEventOrdering: 'detached',
    });
    this.started = true;
    console.log('Matrix client started');
  }

  stop() {
    if (!this.client) {
      console.log('stop: no client.');
      return null;
    }

    if (this.started) {
      this.client.removeAllListeners();
      this.client.stopClient();
    }

    delete this.client;
    this.started = false;
  }

  _onSyncEvent(state, prevState, data) {
    switch (state) {
      case 'PREPARED':
        if (data.fromCache) {
          console.log('Matrix client data loaded from storage');
          this._isReady$.next(true);
        } else {
          console.log('Matrix client synced with homeserver');
          if (prevState === 'ERROR') this._error$.next(null);
          if (!this._isReady$.getValue()) this._isReady$.next(true);
          this._isSynced$.next(true);
        }
        break;
      case 'SYNCING':
        if (prevState === 'ERROR' || prevState === 'CATCHUP') {
          this._isSynced$.next(true);
          this._error$.next(null);
        }
        break;
      case 'ERROR':
        console.log('A syncing error ocurred:', { state, prevState, data });
        this._isSynced$.next(false);
        this._error$.next(data);
        break;
      default:
    }
  }
}

const synapseService = new SynapseService();
export default synapseService;
