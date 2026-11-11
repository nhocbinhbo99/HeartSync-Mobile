import type { ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';

type NativeSymbol = ComponentProps<typeof SymbolView>['name'];

const symbols = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  bookmark: { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' },
  bookmarkFilled: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  callEnd: { ios: 'phone.down.fill', android: 'call_end', web: 'call_end' },
  cameraFlip: { ios: 'camera.rotate.fill', android: 'flip_camera_android', web: 'flip_camera_android' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  drag: { ios: 'line.3.horizontal', android: 'drag_indicator', web: 'drag_indicator' },
  error: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  filter: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  forward: { ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  heartOutline: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  locationOff: { ios: 'location.slash', android: 'location_off', web: 'location_off' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  microphone: { ios: 'mic.fill', android: 'mic', web: 'mic' },
  microphoneOff: { ios: 'mic.slash.fill', android: 'mic_off', web: 'mic_off' },
  more: { ios: 'ellipsis', android: 'more_vert', web: 'more_vert' },
  moon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  photoAdd: { ios: 'photo.badge.plus', android: 'add_a_photo', web: 'add_a_photo' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  shield: { ios: 'checkmark.shield.fill', android: 'shield', web: 'shield' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  video: { ios: 'video.fill', android: 'videocam', web: 'videocam' },
  videoOff: { ios: 'video.slash.fill', android: 'videocam_off', web: 'videocam_off' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
} as const;

export type AppIconName = keyof typeof symbols;
type AppIconProps = {
  name: AppIconName | object;
  color: string;
  size?: number;
  weight?: ComponentProps<typeof SymbolView>['weight'];
};

export function AppIcon({ name, color, size = 24 }: AppIconProps) {
  const semanticSymbols = symbols as Record<AppIconName, unknown>;
  const symbol = (
    typeof name === 'string' && name in semanticSymbols ? semanticSymbols[name as AppIconName] : name
  ) as NativeSymbol;
  return <SymbolView name={symbol} size={size} tintColor={color} />;
}
