import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { useAuth } from '../auth/AuthProvider';
import { calculateAge, isAdult } from '../../shared/domain/age';
import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, type } from '../../shared/theme/tokens';
import type { ProfilePhoto, ProfilePrivate, ProfilePublic } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const splitValues = (value: string) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
type Draft = { displayName: string; gender: string; bio: string; occupation: string; education: string; publicLocation: string; dateOfBirth: string; interests: string; languages: string; locationConsent: boolean; latitude: number | null; longitude: number | null; photos: ProfilePhoto[] };
const blankDraft: Draft = { displayName: '', gender: '', bio: '', occupation: '', education: '', publicLocation: '', dateOfBirth: '', interests: '', languages: '', locationConsent: false, latitude: null, longitude: null, photos: [] };

function toDraft(publicProfile: ProfilePublic, privateProfile: ProfilePrivate): Draft {
  return { displayName: publicProfile.displayName, gender: publicProfile.gender, bio: publicProfile.bio ?? '', occupation: publicProfile.occupation ?? '', education: publicProfile.education ?? '', publicLocation: publicProfile.publicLocation ?? '', dateOfBirth: privateProfile.dateOfBirth, interests: publicProfile.interests.join(', '), languages: publicProfile.languages.join(', '), locationConsent: privateProfile.locationConsent, latitude: privateProfile.latitude, longitude: privateProfile.longitude, photos: publicProfile.photos };
}

export function EditProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditProfile'>) {
  const services = useAppServices();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    const result = await services.profile.getMine();
    if (result.ok) setDraft(toDraft(result.data.public, result.data.private));
    else if (result.error.code !== 'not_found') setError(result.error.message);
    setLoading(false);
  }, [services]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const age = useMemo(() => calculateAge(draft.dateOfBirth, new Date()), [draft.dateOfBirth]);

  const requestLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') { setError('Bạn chưa cấp quyền vị trí. Bộ lọc khoảng cách sẽ bị tắt.'); return; }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setDraft((current) => ({ ...current, locationConsent: true, latitude: position.coords.latitude, longitude: position.coords.longitude }));
    setError(''); setNotice('Đã lưu vị trí riêng tư để dùng cho lọc khoảng cách.');
  };
  const addPhoto = async () => {
    if (!services || !user) return;
    if (draft.photos.length >= 6) { setError('Bạn chỉ có thể thêm tối đa sáu ảnh.'); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Cần quyền thư viện ảnh để chọn ảnh hồ sơ.'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.75 });
    if (picked.canceled || !picked.assets[0]) return;
    setSaving(true); setError('');
    const result = await services.profile.uploadPhoto(user.id, picked.assets[0].uri, draft.photos.length);
    setSaving(false);
    if (result.ok) setDraft((current) => ({ ...current, photos: [...current.photos, result.data] })); else setError(result.error.message);
  };
  const removePhoto = async (photo: ProfilePhoto) => {
    if (!services) return;
    setSaving(true); const result = await services.profile.deletePhoto(photo); setSaving(false);
    if (result.ok) setDraft((current) => ({ ...current, photos: current.photos.filter((item) => item.id !== photo.id) })); else setError(result.error.message);
  };
  const save = async () => {
    if (!services || !user) return;
    if (draft.displayName.trim().length < 2 || !draft.gender.trim()) { setError('Tên hiển thị và giới tính là bắt buộc.'); return; }
    if (!isAdult(draft.dateOfBirth)) { setError('Bạn phải nhập ngày sinh hợp lệ và từ 18 tuổi trở lên.'); return; }
    setSaving(true); setError(''); setNotice('');
    const publicProfile: ProfilePublic = { id: user.id, displayName: draft.displayName, age: age ?? 0, gender: draft.gender, bio: draft.bio || null, occupation: draft.occupation || null, education: draft.education || null, publicLocation: draft.publicLocation || null, profileCompletedAt: new Date().toISOString(), photos: draft.photos, interests: splitValues(draft.interests), languages: splitValues(draft.languages) };
    const privateProfile: ProfilePrivate = { userId: user.id, dateOfBirth: draft.dateOfBirth, locationConsent: draft.locationConsent, latitude: draft.locationConsent ? draft.latitude : null, longitude: draft.locationConsent ? draft.longitude : null };
    const publicResult = await services.profile.savePublic(publicProfile);
    const privateResult = publicResult.ok ? await services.profile.savePrivate(privateProfile) : publicResult;
    setSaving(false);
    if (!privateResult.ok) { setError(privateResult.error.message); return; }
    setNotice('Đã lưu hồ sơ. Dữ liệu riêng tư không xuất hiện trong Khám phá.');
  };
  if (!services || !user) return <Screen><StatePanel title="Không thể chỉnh sửa" description="Phiên đăng nhập đã hết hạn." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải form hồ sơ" description="Dữ liệu riêng tư chỉ được tải cho chính bạn." /></Screen>;
  return <Screen keyboardAware>
    <Text accessibilityRole="header" style={styles.title}>Hồ sơ của bạn</Text>
    <Text style={styles.body}>Ngày sinh và tọa độ chỉ dùng để kiểm tra tuổi, quyền riêng tư và lọc khoảng cách.</Text>
    <AppTextField label="Tên hiển thị" value={draft.displayName} onChangeText={(value) => update('displayName', value)} maxLength={80} />
    <AppTextField label="Giới tính" value={draft.gender} onChangeText={(value) => update('gender', value)} maxLength={40} placeholder="Ví dụ: woman" />
    <AppTextField label="Ngày sinh riêng tư" value={draft.dateOfBirth} onChangeText={(value) => update('dateOfBirth', value)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
    {age !== null ? <Text style={styles.hint}>{age >= 18 ? `Đã xác minh độ tuổi: ${age}` : 'Bạn cần từ 18 tuổi để hoàn tất hồ sơ.'}</Text> : null}
    <AppTextField label="Giới thiệu" value={draft.bio} onChangeText={(value) => update('bio', value)} multiline maxLength={500} />
    <AppTextField label="Nghề nghiệp" value={draft.occupation} onChangeText={(value) => update('occupation', value)} maxLength={120} />
    <AppTextField label="Học vấn" value={draft.education} onChangeText={(value) => update('education', value)} maxLength={160} />
    <AppTextField label="Khu vực công khai" value={draft.publicLocation} onChangeText={(value) => update('publicLocation', value)} maxLength={120} placeholder="Ví dụ: Quận 1, TP.HCM" />
    <AppTextField label="Sở thích, cách nhau bằng dấu phẩy" value={draft.interests} onChangeText={(value) => update('interests', value)} />
    <AppTextField label="Ngôn ngữ, cách nhau bằng dấu phẩy" value={draft.languages} onChangeText={(value) => update('languages', value)} placeholder="vi, en" />
    <StatePanel title="Vị trí riêng tư" description={draft.locationConsent && draft.latitude !== null ? 'Đã bật lọc khoảng cách. Tọa độ không hiển thị cho người khác.' : 'Chưa dùng vị trí. Bạn vẫn có thể khám phá người khác, nhưng không lọc được theo khoảng cách.'} />
    <AppButton label={draft.locationConsent ? 'Cập nhật vị trí riêng tư' : 'Bật vị trí cho lọc khoảng cách'} variant="secondary" onPress={() => void requestLocation()} />
    {draft.locationConsent ? <AppButton label="Tắt dùng vị trí" variant="quiet" onPress={() => setDraft((current) => ({ ...current, locationConsent: false, latitude: null, longitude: null }))} /> : null}
    <StatePanel title={`Ảnh hồ sơ (${draft.photos.length}/6)`} description="Ảnh được lưu trong bucket private và chỉ người có quyền xem profile mới nhận URL tạm thời." />
    <AppButton label="Thêm ảnh" variant="secondary" disabled={saving || draft.photos.length >= 6} onPress={() => void addPhoto()} />
    {draft.photos.map((photo, index) => <AppButton key={photo.id} label={`Xóa ảnh ${index + 1}`} variant="danger" disabled={saving} onPress={() => void removePhoto(photo)} />)}
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    <AppButton label={saving ? 'Đang lưu…' : 'Lưu hồ sơ'} disabled={saving} onPress={() => void save()} />
    <AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} />
  </Screen>;
}

export function OtherProfileScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'OtherProfile'>) {
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [error, setError] = useState('');
  useEffect(() => { if (services && route.params?.profileId) void services.profile.getPublic(route.params.profileId).then((result) => result.ok ? setProfile(result.data) : setError(result.error.message)); }, [route.params?.profileId, services]);
  if (!route.params?.profileId) return <Screen><StatePanel title="Chưa chọn hồ sơ" description="Hãy chọn một hồ sơ từ Khám phá hoặc Đã lưu." /></Screen>;
  if (error) return <Screen><AsyncStatePanel state="error" title="Không thể xem hồ sơ" description={error} actionLabel="Quay lại" onAction={navigation.goBack} /></Screen>;
  if (!profile) return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Chỉ dữ liệu công khai được tải." /></Screen>;
  return <Screen>
    <Text accessibilityRole="header" style={styles.title}>{profile.displayName}, {profile.age}</Text>
    <Text style={styles.body}>{profile.bio || 'Chưa có giới thiệu.'}</Text>
    <StatePanel title="Thông tin công khai" description={[profile.occupation, profile.education, profile.publicLocation, profile.interests.join(', '), profile.languages.join(', ')].filter(Boolean).join('\n') || 'Chưa bổ sung thêm thông tin.'} />
    <AppButton label="Lưu hồ sơ" onPress={() => void services?.saved.setSaved(profile.id, true)} />
    <AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} />
  </Screen>;
}

export function SafetyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Safety'>) {
  return <Screen><StatePanel title="An toàn & quyền riêng tư" description="Email, ngày sinh, tọa độ và báo cáo không xuất hiện trong Khám phá. Chặn một người sẽ kết thúc match và ẩn lịch sử tương tác." />
    <AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} /></Screen>;
}

const styles = StyleSheet.create({ title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted }, hint: { ...type.caption, color: colors.primaryPressed }, error: { ...type.caption, color: colors.danger }, notice: { ...type.caption, color: colors.success } });
