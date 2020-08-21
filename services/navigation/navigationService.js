import { BehaviorSubject } from 'rxjs';

export const route$ = new BehaviorSubject(null);

export function getActiveRoute(state, parentPath = '') {
  const route = state.routes[state.index];
  const path = `${parentPath}/${route.name}`;
  if (route.state) {
    return getActiveRoute(route.state, path);
  }
  console.log({ ...route, path });

  return { ...route, path };
}
