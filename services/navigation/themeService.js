import { BehaviorSubject } from 'rxjs';
import { Appearance } from 'react-native';

export const isDark$ = new BehaviorSubject(null);

export function getActiveRoute(state, parentPath = '') {
  const route = state.routes[state.index];
  const path = `${parentPath}/${route.name}`;
  if (route.state) {
    return getActiveRoute(route.state, path);
  }
  console.log({ ...route, path });

  return { ...route, path };
}

class ThemeService {
  _isDark$;

  constructor() {
    this._isDark$ = new BehaviorSubject(Appearance.getColorScheme() === 'dark');

    Appearance.addChangeListener(this.appearanceListener.bind(this));
  }

  appearanceListener = ({ colorScheme }) => {
    this._isDark$.next(colorScheme === 'dark');
  };

  getIsDark$() {
    return this._isDark$;
  }

  destroy() {
    Appearance.removeChangeListener(this.appearanceListener.bind(this));
  }
}

const themeService = new ThemeService();
export default themeService;
