import type { ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';

type NativeSymbol = ComponentProps<typeof SymbolView>['name'];

const symbols = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  bell: { ios: 'bell', android: 'notifications_none', web: 'notifications_none' },
  bookmark: { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' },
  bookmarkFilled: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  callEnd: { ios: 'phone.down.fill', android: 'call_end', web: 'call_end' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  cameraFlip: { ios: 'camera.rotate.fill', android: 'flip_camera_android', web: 'flip_camera_android' },
  chatBubble: { ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' },
  chatBubbleFilled: { ios: 'bubble.left.fill', android: 'chat_bubble', web: 'chat_bubble' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  compass: { ios: 'safari', android: 'explore', web: 'explore' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  drag: { ios: 'line.3.horizontal', android: 'drag_indicator', web: 'drag_indicator' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  error: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' },
  forward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  heartOutline: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  help: { ios: 'questionmark.circle', android: 'help_outline', web: 'help_outline' },
  home: { ios: 'house', android: 'home', web: 'home' },
  info: { ios: 'info.circle', android: 'info_outline', web: 'info_outline' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  locationOff: { ios: 'location.slash', android: 'location_off', web: 'location_off' },
  lock: { ios: 'lock', android: 'lock_outline', web: 'lock_outline' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  mail: { ios: 'envelope', android: 'mail_outline', web: 'mail_outline' },
  microphone: { ios: 'mic.fill', android: 'mic', web: 'mic' },
  microphoneOff: { ios: 'mic.slash.fill', android: 'mic_off', web: 'mic_off' },
  more: { ios: 'ellipsis', android: 'more_vert', web: 'more_vert' },
  moon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  person: { ios: 'person', android: 'person_outline', web: 'person_outline' },
  personFilled: { ios: 'person.fill', android: 'person', web: 'person' },
  photoAdd: { ios: 'photo.badge.plus', android: 'add_a_photo', web: 'add_a_photo' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  refresh: { ios: 'arrow.counterclockwise', android: 'replay', web: 'replay' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  shield: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
  smile: { ios: 'face.smiling', android: 'sentiment_satisfied_alt', web: 'sentiment_satisfied_alt' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
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
