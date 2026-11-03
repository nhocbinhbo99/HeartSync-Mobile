import { filterChoiceOptions, optionLabel, toggleChoice } from '../profileOptions';
import { validateProfile } from '../profileValidation';

const validProfile = {
  displayName: 'An Bình',
  gender: 'man',
  dateOfBirth: '1998-02-03',
  bio: 'Thích đọc sách và cà phê.',
  occupation: 'Công nghệ thông tin',
  education: 'Đại học',
  publicLocation: 'TP. Hồ Chí Minh',
  interests: ['Đọc sách', 'Cà phê'],
  languages: ['vi', 'en'],
};

describe('profile domain rules', () => {
  it('accepts a structured adult profile', () => {
    expect(validateProfile(validProfile, new Date('2026-11-03T00:00:00Z'))).toEqual({});
  });

  it('rejects underage, unknown catalog values and duplicate interests', () => {
    expect(validateProfile({
      ...validProfile,
      gender: 'unknown',
      dateOfBirth: '2012-02-03',
      interests: ['Cà phê', 'Cà phê'],
      languages: ['xx'],
    }, new Date('2026-11-03T00:00:00Z'))).toEqual(expect.objectContaining({
      gender: expect.any(String),
      dateOfBirth: expect.any(String),
      interests: expect.any(String),
      languages: expect.any(String),
    }));
  });

  it('toggles multi-choice values without mutating the original list', () => {
    const values = ['vi'];
    expect(toggleChoice(values, 'en')).toEqual(['vi', 'en']);
    expect(toggleChoice(values, 'vi')).toEqual([]);
    expect(values).toEqual(['vi']);
  });

  it('maps a single choice and searches catalog labels without changing the catalog', () => {
    const options = [{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'Tiếng Anh' }];
    expect(optionLabel(options, 'en')).toBe('Tiếng Anh');
    expect(filterChoiceOptions(options, ' anh ')).toEqual([{ value: 'en', label: 'Tiếng Anh' }]);
    expect(options).toHaveLength(2);
  });
});
