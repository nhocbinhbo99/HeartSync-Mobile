import type { ImageSourcePropType } from 'react-native';

const femaleAvatars: ImageSourcePropType[] = [
  require('../../../assets/avatars/avatar_w1.jpg'),
  require('../../../assets/avatars/avatar_w2.jpg'),
  require('../../../assets/avatars/avatar_w3.jpg'),
  require('../../../assets/avatars/avatar_w4.jpg'),
  require('../../../assets/avatars/avatar_w5.jpg'),
  require('../../../assets/avatars/avatar_w6.jpg'),
];

const maleAvatars: ImageSourcePropType[] = [
  require('../../../assets/avatars/avatar_m1.jpg'),
  require('../../../assets/avatars/avatar_m2.jpg'),
  require('../../../assets/avatars/avatar_m3.jpg'),
  require('../../../assets/avatars/avatar_m4.jpg'),
  require('../../../assets/avatars/avatar_m5.jpg'),
  require('../../../assets/avatars/avatar_m6.jpg'),
];

export function getFallbackAvatar(id: string, gender?: string): ImageSourcePropType {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const isFemale = gender === 'woman';
  const isMale = gender === 'man';

  if (isFemale) {
    return femaleAvatars[hash % femaleAvatars.length];
  }
  if (isMale) {
    return maleAvatars[hash % maleAvatars.length];
  }
  // Alternating for nonbinary or others
  const all = [...femaleAvatars, ...maleAvatars];
  return all[hash % all.length];
}
