export type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

export const GENDER_OPTIONS: readonly ChoiceOption[] = [
  { value: 'man', label: 'Nam' },
  { value: 'woman', label: 'Nữ' },
  { value: 'nonbinary', label: 'Phi nhị nguyên' },
  { value: 'prefer_not_to_say', label: 'Không muốn trả lời' },
];

export const LANGUAGE_OPTIONS: readonly ChoiceOption[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'Tiếng Anh' },
  { value: 'zh', label: 'Tiếng Trung' },
  { value: 'ja', label: 'Tiếng Nhật' },
  { value: 'ko', label: 'Tiếng Hàn' },
  { value: 'fr', label: 'Tiếng Pháp' },
  { value: 'de', label: 'Tiếng Đức' },
  { value: 'es', label: 'Tiếng Tây Ban Nha' },
];

export const EDUCATION_OPTIONS: readonly ChoiceOption[] = [
  { value: 'Trung học phổ thông', label: 'Trung học phổ thông' },
  { value: 'Trung cấp', label: 'Trung cấp' },
  { value: 'Cao đẳng', label: 'Cao đẳng' },
  { value: 'Đại học', label: 'Đại học' },
  { value: 'Sau đại học', label: 'Sau đại học' },
  { value: 'Khác', label: 'Khác' },
];

export const OCCUPATION_OPTIONS: readonly ChoiceOption[] = [
  { value: 'Sinh viên', label: 'Sinh viên' },
  { value: 'Công nghệ thông tin', label: 'Công nghệ thông tin' },
  { value: 'Kinh doanh', label: 'Kinh doanh' },
  { value: 'Marketing / Truyền thông', label: 'Marketing / Truyền thông' },
  { value: 'Giáo dục', label: 'Giáo dục' },
  { value: 'Y tế', label: 'Y tế' },
  { value: 'Thiết kế / Sáng tạo', label: 'Thiết kế / Sáng tạo' },
  { value: 'Tài chính / Kế toán', label: 'Tài chính / Kế toán' },
  { value: 'Kỹ thuật', label: 'Kỹ thuật' },
  { value: 'Dịch vụ', label: 'Dịch vụ' },
  { value: '__other__', label: 'Nghề nghiệp khác' },
];

export const LOCATION_OPTIONS: readonly ChoiceOption[] = [
  { value: 'TP. Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'Đà Nẵng', label: 'Đà Nẵng' },
  { value: 'Hải Phòng', label: 'Hải Phòng' },
  { value: 'Cần Thơ', label: 'Cần Thơ' },
  { value: 'Huế', label: 'Huế' },
  { value: 'Đồng Nai', label: 'Đồng Nai' },
  { value: 'Bình Dương', label: 'Bình Dương' },
  { value: 'Khánh Hòa', label: 'Khánh Hòa' },
  { value: 'Lâm Đồng', label: 'Lâm Đồng' },
  { value: '__other__', label: 'Khu vực khác' },
];

export function optionLabel(options: readonly ChoiceOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function toggleChoice(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function filterChoiceOptions(options: readonly ChoiceOption[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('vi');
  return normalized ? options.filter((option) => option.label.toLocaleLowerCase('vi').includes(normalized)) : [...options];
}
