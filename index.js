/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import authService from './services/auth/authService';

authService.init();

AppRegistry.registerComponent(appName, () => App);
