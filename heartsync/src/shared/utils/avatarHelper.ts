import type { ImageSourcePropType } from 'react-native';

const femaleAvatars: ImageSourcePropType[] = [
  require('../../../assets/avatars/avatar_w5.jpg'),
  require('../../../assets/avatars/avatar_w1.jpg'),
  require('../../../assets/avatars/avatar_w3.jpg'),
  require('../../../assets/avatars/avatar_w4.jpg'),
  require('../../../assets/avatars/avatar_w2.jpg'),
  require('../../../assets/avatars/avatar_w6.jpg'),
];

const maleAvatars: ImageSourcePropType[] = [
  require('../../../assets/avatars/avatar_m1.jpg'),
  require('../../../assets/avatars/avatar_m2.jpg'),
  require('../../../assets/avatars/avatar_m3.jpg'),
  require('../../../assets/avatars/avatar_m4.jpg'),
  require('../../../assets/avatars/avatar_m5.jpg'),
];

export const brandAssets = {
  logoPink: require('../../../assets/images/heartsync-logo.png') as ImageSourcePropType,
  logoWhite: require('../../../assets/images/heartsync-logo-white.png') as ImageSourcePropType,
  splashSunsetBg: require('../../../assets/images/splash-sunset-bg.png') as ImageSourcePropType,
  cardScrimGradient: require('../../../assets/images/card-scrim-gradient.png') as ImageSourcePropType,
  pinkButtonGradient: require('../../../assets/images/pink-button-gradient.png') as ImageSourcePropType,
  onboardingCouple: require('../../../assets/images/onboarding-couple.png') as ImageSourcePropType,
  onboardingChat: require('../../../assets/images/onboarding-chat.png') as ImageSourcePropType,
  onboardingShield: require('../../../assets/images/onboarding-shield.png') as ImageSourcePropType,
};

export const onboardingAvatars = {
  woman: femaleAvatars[0],
  man: maleAvatars[0],
};

const NATURAL_BIOS = [
  'Thích những buổi cà phê chiều cuối tuần, nghe nhạc indie và dạo phố cùng người hợp tần số ✨',
  'Yêu thích chụp ảnh phim, đi du lịch Đà Lạt và những cuộc trò chuyện chân thành, ấm áp ☕',
  'Người hướng nội vừa đủ, thích nấu ăn tại nhà, đọc sách và tìm kiếm một kết nối nghiêm túc 💕',
  'Mê khám phá các quán cà phê nhỏ xinh, thích xem phim cuối tuần và yêu động vật 🐱',
  'Thích sự nhẹ nhàng, tử tế và những buổi hẹn hò giản dị ngắm hoàng hôn thành phố 🌇',
  'Đam mê thiết kế, yêu âm nhạc acoustic và luôn trân trọng những điều nhỏ bé trong cuộc sống 🌸',
];

const NATURAL_OCCUPATIONS = [
  'Thiết kế đồ họa',
  'Marketing sáng tạo',
  'Nhiếp ảnh tự do',
  'Kiến trúc sư',
  'Chuyên viên truyền thông',
  'Quản lý thương hiệu',
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getFallbackAvatar(id: string, gender?: string, displayName?: string): ImageSourcePropType {
  const hash = hashString(id || displayName || 'heartsync');
  if (gender === 'woman') return femaleAvatars[hash % femaleAvatars.length];
  if (gender === 'man') return maleAvatars[hash % maleAvatars.length];

  const lowerName = (displayName ?? '').toLowerCase();
  const isLikelyFemale =
    lowerName.includes('anh') ||
    lowerName.includes('linh') ||
    lowerName.includes('my') ||
    lowerName.includes('vy') ||
    lowerName.includes('thảo') ||
    lowerName.includes('cẩm') ||
    lowerName.includes('ngọc') ||
    lowerName.includes('hương') ||
    lowerName.includes('trang') ||
    lowerName.includes('nhi');
  if (isLikelyFemale) return femaleAvatars[hash % femaleAvatars.length];

  const all = [...femaleAvatars, ...maleAvatars];
  return all[hash % all.length];
}

export function getProfileImageSource(
  remoteUri: string | null | undefined,
  id: string,
  gender?: string,
  displayName?: string,
): ImageSourcePropType {
  if (
    remoteUri &&
    !remoteUri.includes('picsum.photos') &&
    !remoteUri.includes('unsplash.com') &&
    !remoteUri.includes('placeholder') &&
    !remoteUri.includes('pravatar')
  ) {
    return { uri: remoteUri };
  }
  return getFallbackAvatar(id, gender, displayName);
}

export function formatNaturalBio(bio: string | null | undefined, id = 'bio'): string {
  const trimmed = (bio ?? '').trim();
  if (
    !trimmed ||
    trimmed.toLowerCase().includes('synthetic') ||
    trimmed.toLowerCase().includes('kiểm thử') ||
    trimmed.toLowerCase().includes('seed')
  ) {
    const hash = hashString(id || 'bio');
    return NATURAL_BIOS[hash % NATURAL_BIOS.length];
  }
  return trimmed;
}

export function formatNaturalOccupation(occupation: string | null | undefined, id = 'job'): string {
  const trimmed = (occupation ?? '').trim();
  if (
    !trimmed ||
    trimmed.toLowerCase().includes('kiểm thử') ||
    trimmed.toLowerCase().includes('synthetic') ||
    trimmed.toLowerCase().includes('qa')
  ) {
    const hash = hashString(id || 'job');
    return NATURAL_OCCUPATIONS[hash % NATURAL_OCCUPATIONS.length];
  }
  return trimmed;
}
