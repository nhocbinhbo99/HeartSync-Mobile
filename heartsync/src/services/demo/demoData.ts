import type { ProfilePublic } from '../../shared/types/domain.types';

/**
 * DEMO_ONLY: fictional preview/test fixtures. Do not import from production adapters and never
 * fall back to these values after a Supabase failure.
 */
export const DEMO_ONLY_PROFILES: ProfilePublic[] = [
  {
    id: 'demo-profile-lan',
    displayName: 'Lan',
    age: 24,
    gender: 'woman',
    bio: 'Thích đọc sách và khám phá những quán cà phê yên tĩnh.',
    occupation: 'Thiết kế sản phẩm',
    education: 'Đại học giả lập',
    publicLocation: 'Thành phố mẫu',
    profileCompletedAt: '2026-01-01T00:00:00.000Z',
    photos: [],
    interests: ['Đọc sách', 'Cà phê'],
    languages: ['vi'],
  },
  {
    id: 'demo-profile-minh',
    displayName: 'Minh',
    age: 27,
    gender: 'man',
    bio: 'Chạy bộ cuối tuần và thích nấu món mới.',
    occupation: 'Kỹ sư phần mềm',
    education: 'Trường giả lập',
    publicLocation: 'Quận mẫu',
    profileCompletedAt: '2026-01-02T00:00:00.000Z',
    photos: [],
    interests: ['Chạy bộ', 'Nấu ăn'],
    languages: ['vi', 'en'],
  },
];
