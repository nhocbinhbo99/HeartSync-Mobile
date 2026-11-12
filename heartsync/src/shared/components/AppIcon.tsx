import { Image, type ImageSourcePropType } from 'react-native';

const iconSources = {
  add: require('../../../assets/icons/ic-add.png') as ImageSourcePropType,
  back: require('../../../assets/icons/ic-back.png') as ImageSourcePropType,
  bell: require('../../../assets/icons/ic-bell.png') as ImageSourcePropType,
  bookmark: require('../../../assets/icons/ic-bookmark.png') as ImageSourcePropType,
  bookmarkFilled: require('../../../assets/icons/ic-bookmarkFilled.png') as ImageSourcePropType,
  calendar: require('../../../assets/icons/ic-calendar.png') as ImageSourcePropType,
  callEnd: require('../../../assets/icons/ic-callEnd.png') as ImageSourcePropType,
  camera: require('../../../assets/icons/ic-camera.png') as ImageSourcePropType,
  cameraFlip: require('../../../assets/icons/ic-cameraFlip.png') as ImageSourcePropType,
  chatBubble: require('../../../assets/icons/ic-chatBubble.png') as ImageSourcePropType,
  chatBubbleFilled: require('../../../assets/icons/ic-chatBubbleFilled.png') as ImageSourcePropType,
  check: require('../../../assets/icons/ic-check.png') as ImageSourcePropType,
  checkCircle: require('../../../assets/icons/ic-checkCircle.png') as ImageSourcePropType,
  chevronDown: require('../../../assets/icons/ic-chevronDown.png') as ImageSourcePropType,
  chevronRight: require('../../../assets/icons/ic-chevronRight.png') as ImageSourcePropType,
  close: require('../../../assets/icons/ic-close.png') as ImageSourcePropType,
  compass: require('../../../assets/icons/ic-compass.png') as ImageSourcePropType,
  compassFilled: require('../../../assets/icons/ic-compassFilled.png') as ImageSourcePropType,
  delete: require('../../../assets/icons/ic-delete.png') as ImageSourcePropType,
  drag: require('../../../assets/icons/ic-drag.png') as ImageSourcePropType,
  edit: require('../../../assets/icons/ic-edit.png') as ImageSourcePropType,
  error: require('../../../assets/icons/ic-error.png') as ImageSourcePropType,
  eye: require('../../../assets/icons/ic-eye.png') as ImageSourcePropType,
  eyeOff: require('../../../assets/icons/ic-eyeOff.png') as ImageSourcePropType,
  filter: require('../../../assets/icons/ic-filter.png') as ImageSourcePropType,
  forward: require('../../../assets/icons/ic-forward.png') as ImageSourcePropType,
  heart: require('../../../assets/icons/ic-heart.png') as ImageSourcePropType,
  heartOutline: require('../../../assets/icons/ic-heartOutline.png') as ImageSourcePropType,
  help: require('../../../assets/icons/ic-help.png') as ImageSourcePropType,
  home: require('../../../assets/icons/ic-home.png') as ImageSourcePropType,
  homeFilled: require('../../../assets/icons/ic-homeFilled.png') as ImageSourcePropType,
  info: require('../../../assets/icons/ic-info.png') as ImageSourcePropType,
  location: require('../../../assets/icons/ic-location.png') as ImageSourcePropType,
  locationOff: require('../../../assets/icons/ic-locationOff.png') as ImageSourcePropType,
  lock: require('../../../assets/icons/ic-lock.png') as ImageSourcePropType,
  logout: require('../../../assets/icons/ic-logout.png') as ImageSourcePropType,
  mail: require('../../../assets/icons/ic-mail.png') as ImageSourcePropType,
  microphone: require('../../../assets/icons/ic-microphone.png') as ImageSourcePropType,
  microphoneOff: require('../../../assets/icons/ic-microphoneOff.png') as ImageSourcePropType,
  more: require('../../../assets/icons/ic-more.png') as ImageSourcePropType,
  moon: require('../../../assets/icons/ic-moon.png') as ImageSourcePropType,
  minus: require('../../../assets/icons/ic-minus.png') as ImageSourcePropType,
  person: require('../../../assets/icons/ic-person.png') as ImageSourcePropType,
  personFilled: require('../../../assets/icons/ic-personFilled.png') as ImageSourcePropType,
  photoAdd: require('../../../assets/icons/ic-photoAdd.png') as ImageSourcePropType,
  phone: require('../../../assets/icons/ic-phone.png') as ImageSourcePropType,
  refresh: require('../../../assets/icons/ic-refresh.png') as ImageSourcePropType,
  search: require('../../../assets/icons/ic-search.png') as ImageSourcePropType,
  send: require('../../../assets/icons/ic-send.png') as ImageSourcePropType,
  settings: require('../../../assets/icons/ic-settings.png') as ImageSourcePropType,
  shield: require('../../../assets/icons/ic-shield.png') as ImageSourcePropType,
  smile: require('../../../assets/icons/ic-smile.png') as ImageSourcePropType,
  sparkle: require('../../../assets/icons/ic-sparkle.png') as ImageSourcePropType,
  star: require('../../../assets/icons/ic-star.png') as ImageSourcePropType,
  verified: require('../../../assets/icons/ic-verified.png') as ImageSourcePropType,
  video: require('../../../assets/icons/ic-video.png') as ImageSourcePropType,
  videoOff: require('../../../assets/icons/ic-videoOff.png') as ImageSourcePropType,
  warning: require('../../../assets/icons/ic-warning.png') as ImageSourcePropType,
} as const;

export type AppIconName = keyof typeof iconSources;

type AppIconProps = {
  name: AppIconName;
  color: string;
  size?: number;
};

export function AppIcon({ name, color, size = 24 }: AppIconProps) {
  const source = iconSources[name] ?? iconSources.sparkle;
  return (
    <Image
      source={source}
      fadeDuration={0}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={{
        width: size,
        height: size,
        tintColor: color,
      }}
    />
  );
}
