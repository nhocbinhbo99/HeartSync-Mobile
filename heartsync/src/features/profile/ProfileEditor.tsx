import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { User } from '@supabase/supabase-js';
import { useNavigation, type NavigationAction, type NavigationProp } from '@react-navigation/native';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { BottomActionBar } from '../../shared/components/BottomActionBar';
import { DateField } from '../../shared/components/DateField';
import { FormField } from '../../shared/components/FormField';
import { LocationConsentField } from '../../shared/components/LocationConsentField';
import { MultiChoiceField, SingleChoiceField } from '../../shared/components/ChoiceFields';
import { PhotoGrid, type PhotoGridItem } from '../../shared/components/PhotoGrid';
import { Screen } from '../../shared/components/Screen';
import { useSnackbar } from '../../shared/components/Snackbar';
import { StatePanel } from '../../shared/components/StatePanel';
import { UnsavedChangesDialog } from '../../shared/components/UnsavedChangesDialog';
import {
  EDUCATION_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  LOCATION_OPTIONS,
  OCCUPATION_OPTIONS,
  type ChoiceOption,
} from '../../shared/domain/profileOptions';
import { hasProfileErrors, validateProfile, type ProfileFieldErrors } from '../../shared/domain/profileValidation';
import { colors, spacing, type } from '../../shared/theme/tokens';
import type { InterestOption, ProfilePhoto, ProfilePrivate, ProfilePublic, ProfileSaveInput } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../auth/AuthProvider';
import { AiBioAssistant } from '../ai/AiBioAssistant';

type Draft = {
  displayName: string;
  gender: string;
  bio: string;
  occupation: string;
  education: string;
  publicLocation: string;
  dateOfBirth: string;
  interests: string[];
  languages: string[];
  locationConsent: boolean;
  latitude: number | null;
  longitude: number | null;
  photos: ProfilePhoto[];
};

const blankDraft: Draft = {
  displayName: '', gender: '', bio: '', occupation: '', education: '', publicLocation: '',
  dateOfBirth: '', interests: [], languages: [], locationConsent: false, latitude: null, longitude: null, photos: [],
};

function fromProfile(publicProfile: ProfilePublic, privateProfile: ProfilePrivate): Draft {
  return {
    displayName: publicProfile.displayName,
    gender: publicProfile.gender,
    bio: publicProfile.bio ?? '',
    occupation: publicProfile.occupation ?? '',
    education: publicProfile.education ?? '',
    publicLocation: publicProfile.publicLocation ?? '',
    dateOfBirth: privateProfile.dateOfBirth,
    interests: publicProfile.interests,
    languages: publicProfile.languages,
    locationConsent: privateProfile.locationConsent,
    latitude: privateProfile.latitude,
    longitude: privateProfile.longitude,
    photos: publicProfile.photos,
  };
}

function fromMetadata(user: User): Draft {
  const metadata = user.user_metadata ?? {};
  return {
    ...blankDraft,
    displayName: typeof metadata.onboarding_display_name === 'string' ? metadata.onboarding_display_name : '',
    dateOfBirth: typeof metadata.onboarding_date_of_birth === 'string' ? metadata.onboarding_date_of_birth : '',
    gender: typeof metadata.onboarding_gender === 'string' ? metadata.onboarding_gender : '',
  };
}

function snapshot(draft: Draft) {
  const { photos: _photos, ...fields } = draft;
  return JSON.stringify(fields);
}

function otherValue(value: string, options: readonly ChoiceOption[]) {
  return options.some((option) => option.value === value) ? value : value ? '__other__' : '';
}

type Props = {
  mode: 'setup' | 'edit';
  onCompleted?: () => void;
  onCancel?: () => void;
};

export function ProfileEditor({ mode, onCompleted, onCancel }: Props) {
  const services = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, completeOnboarding, refreshProfileStatus } = useAuth();
  const snackbar = useSnackbar();
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [interestOptions, setInterestOptions] = useState<ChoiceOption[]>([]);
  const [photoItems, setPhotoItems] = useState<PhotoGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [error, setError] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [customOccupation, setCustomOccupation] = useState(false);
  const [customLocation, setCustomLocation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<NavigationAction>();
  const allowNextNavigation = useRef(false);
  const isDirty = initialSnapshot !== '' && snapshot(draft) !== initialSnapshot;

  const dateLimits = useMemo(() => {
    const maximum = new Date();
    maximum.setHours(0, 0, 0, 0);
    maximum.setFullYear(maximum.getFullYear() - 18);
    const minimum = new Date(maximum);
    minimum.setFullYear(minimum.getFullYear() - 102);
    return { maximum, minimum };
  }, []);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const loadPhotoUrls = useCallback(async (photos: ProfilePhoto[]) => {
    if (!services) return;
    setPhotoItems(photos.map((photo) => ({ ...photo, loading: true })));
    const resolved = await Promise.all(photos.map(async (photo): Promise<PhotoGridItem> => {
      const result = await services.profile.createPhotoUrl(photo.storagePath);
      return result.ok ? { ...photo, url: result.data } : { ...photo, error: true };
    }));
    setPhotoItems(resolved);
  }, [services]);

  const load = useCallback(async () => {
    if (!services || !user) return;
    setLoading(true);
    setError('');
    const [profileResult, interestsResult] = await Promise.all([
      services.profile.getMine(),
      services.profile.listInterests(),
    ]);
    if (!interestsResult.ok) {
      setError(interestsResult.error.message);
      setLoading(false);
      return;
    }
    setInterestOptions(interestsResult.data.map((interest: InterestOption) => ({ value: interest.label, label: interest.label })));
    const nextDraft = profileResult.ok ? fromProfile(profileResult.data.public, profileResult.data.private) : fromMetadata(user);
    if (!profileResult.ok && profileResult.error.code !== 'not_found') setError(profileResult.error.message);
    setDraft(nextDraft);
    setCustomOccupation(Boolean(nextDraft.occupation) && !OCCUPATION_OPTIONS.some((option) => option.value === nextDraft.occupation));
    setCustomLocation(Boolean(nextDraft.publicLocation) && !LOCATION_OPTIONS.some((option) => option.value === nextDraft.publicLocation));
    setInitialSnapshot(snapshot(nextDraft));
    if (profileResult.ok) await loadPhotoUrls(profileResult.data.public.photos);
    setLoading(false);
  }, [loadPhotoUrls, services, user]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (allowNextNavigation.current) {
      allowNextNavigation.current = false;
      return;
    }
    if (mode !== 'edit' || !isDirty || saving) return;
    event.preventDefault();
    setPendingNavigation(event.data.action);
  }), [isDirty, mode, navigation, saving]);

  const requestLocation = async () => {
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setDraft((current) => ({ ...current, locationConsent: false, latitude: null, longitude: null }));
        if (!permission.canAskAgain) {
          Alert.alert('Quyền vị trí đang bị chặn', 'Mở Cài đặt Android để cấp quyền vị trí cho HeartSync.', [
            { text: 'Để sau', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
          ]);
        } else setError('Bạn chưa cấp quyền vị trí. Bộ lọc khoảng cách sẽ được tắt.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDraft((current) => ({ ...current, locationConsent: true, latitude: position.coords.latitude, longitude: position.coords.longitude }));
      snackbar.show({ message: 'Đã cập nhật vị trí riêng tư.', tone: 'success' });
    } catch {
      setError('Không thể lấy vị trí lúc này. Hãy kiểm tra GPS và thử lại.');
    }
  };

  const setLocationConsent = (value: boolean) => {
    if (value) void requestLocation();
    else setDraft((current) => ({ ...current, locationConsent: false, latitude: null, longitude: null }));
  };

  const addPhoto = async () => {
    if (!services || draft.photos.length >= 6) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Cần quyền thư viện ảnh để chọn ảnh hồ sơ.');
      if (!permission.canAskAgain) Alert.alert('Quyền thư viện đang bị chặn', 'Bạn có thể cấp lại quyền trong Cài đặt Android.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.8 });
    if (picked.canceled || !picked.assets[0]) return;
    setPhotoBusy(true);
    setError('');
    const result = await services.profile.uploadPhoto(picked.assets[0].uri, draft.photos.length);
    setPhotoBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    const photos = [...draft.photos, result.data].sort((a, b) => a.sortOrder - b.sortOrder);
    setDraft((current) => ({ ...current, photos }));
    await loadPhotoUrls(photos);
  };

  const removePhoto = (photo: ProfilePhoto) => {
    Alert.alert('Xóa ảnh hồ sơ?', 'Ảnh sẽ bị xóa khỏi hồ sơ và không thể khôi phục trong ứng dụng.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => void confirmRemovePhoto(photo) },
    ]);
  };

  const confirmRemovePhoto = async (photo: ProfilePhoto) => {
    if (!services) return;
    setPhotoBusy(true);
    setError('');
    const deleted = await services.profile.deletePhoto(photo);
    if (!deleted.ok) { setPhotoBusy(false); setError(deleted.error.message); await load(); return; }
    const remainingIds = draft.photos.filter((item) => item.id !== photo.id).map((item) => item.id);
    const reordered = await services.profile.reorderPhotos(remainingIds);
    setPhotoBusy(false);
    if (!reordered.ok) { setError(reordered.error.message); await load(); return; }
    setDraft((current) => ({ ...current, photos: reordered.data }));
    await loadPhotoUrls(reordered.data);
  };

  const reorderPhoto = async (photoId: string, targetIndex: number) => {
    if (!services) return;
    const ids = draft.photos.map((photo) => photo.id);
    const currentIndex = ids.indexOf(photoId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ids.length || targetIndex === currentIndex) return;
    const [moved] = ids.splice(currentIndex, 1);
    ids.splice(targetIndex, 0, moved);
    setPhotoBusy(true);
    const result = await services.profile.reorderPhotos(ids);
    setPhotoBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    setDraft((current) => ({ ...current, photos: result.data }));
    await loadPhotoUrls(result.data);
  };

  const setPrimaryPhoto = async (photoId: string) => {
    if (!services) return;
    setPhotoBusy(true);
    const result = await services.profile.setPrimaryPhoto(photoId);
    setPhotoBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    const photos = [...draft.photos]
      .sort((a, b) => a.id === photoId ? -1 : b.id === photoId ? 1 : a.sortOrder - b.sortOrder)
      .map((photo, index) => ({ ...photo, sortOrder: index, isPrimary: photo.id === photoId }));
    setDraft((current) => ({ ...current, photos }));
    await loadPhotoUrls(photos);
  };

  const save = async () => {
    if (!services) return;
    const fieldErrors = validateProfile(draft);
    setErrors(fieldErrors);
    setError('');
    if (hasProfileErrors(fieldErrors)) return;
    if (draft.locationConsent && (draft.latitude === null || draft.longitude === null)) {
      setError('Hãy cập nhật vị trí hoặc tắt dùng vị trí trước khi lưu.');
      return;
    }
    const input: ProfileSaveInput = {
      displayName: draft.displayName.trim(),
      gender: draft.gender,
      dateOfBirth: draft.dateOfBirth,
      bio: draft.bio.trim() || null,
      occupation: draft.occupation.trim() || null,
      education: draft.education || null,
      publicLocation: draft.publicLocation.trim() || null,
      interests: draft.interests,
      languages: draft.languages,
      locationConsent: draft.locationConsent,
      latitude: draft.locationConsent ? draft.latitude : null,
      longitude: draft.locationConsent ? draft.longitude : null,
    };
    setSaving(true);
    const result = await services.profile.save(input);
    if (!result.ok) { setSaving(false); setError(result.error.message); return; }
    const nextDraft = { ...fromProfile(result.data.public, result.data.private), photos: draft.photos };
    setDraft(nextDraft);
    setInitialSnapshot(snapshot(nextDraft));
    if (mode === 'setup') {
      const completed = await completeOnboarding();
      setSaving(false);
      if (!completed.ok) { setError(completed.message); return; }
      onCompleted?.();
      return;
    }
    await refreshProfileStatus();
    setSaving(false);
    snackbar.show({ message: 'Đã lưu hồ sơ. Dữ liệu riêng tư không xuất hiện trong Khám phá.', tone: 'success' });
  };

  const cancel = () => {
    onCancel?.();
  };

  if (!services || !user) return <Screen><StatePanel title="Không thể chỉnh sửa" description="Phiên đăng nhập đã hết hạn." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang chuẩn bị hồ sơ" description="Dữ liệu riêng tư chỉ được tải cho chính bạn." /></Screen>;

  const occupationChoice = customOccupation ? '__other__' : otherValue(draft.occupation, OCCUPATION_OPTIONS);
  const locationChoice = customLocation ? '__other__' : otherValue(draft.publicLocation, LOCATION_OPTIONS);
  const actions = <BottomActionBar>
    <AppButton label={saving ? 'Đang lưu' : mode === 'setup' ? 'Hoàn tất hồ sơ' : 'Lưu thay đổi'} loading={saving}
      trailingIcon="check" disabled={saving || photoBusy || !isDirty && mode === 'edit'} onPress={() => void save()} />
    {onCancel ? <AppButton label={mode === 'setup' ? 'Đăng xuất và làm sau' : 'Quay lại'} variant="quiet" leadingIcon="back" disabled={saving}
      onPress={cancel} /> : null}
  </BottomActionBar>;

  return <Screen keyboardAware footer={actions}>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>{mode === 'setup' ? 'Hoàn thiện hồ sơ' : 'Chỉnh sửa hồ sơ'}</Text>
      <Text style={styles.body}>Ngày sinh và tọa độ chỉ dùng để xác minh tuổi và lọc phù hợp. Người khác chỉ thấy thông tin công khai.</Text>
    </View>

    {mode === 'edit' ? <Section title="Ảnh hồ sơ" description="Ảnh chính xuất hiện đầu tiên. Bạn có thể dùng tối đa 6 ảnh.">
      <PhotoGrid photos={photoItems} busy={photoBusy} onAdd={() => void addPhoto()} onDelete={removePhoto}
        onReorder={(id, targetIndex) => void reorderPhoto(id, targetIndex)} onSetPrimary={(id) => void setPrimaryPhoto(id)}
        onRetry={() => void loadPhotoUrls(draft.photos)} />
    </Section> : null}

    <Section title="Thông tin cơ bản" description="Các thông tin này giúp hồ sơ rõ ràng và dễ tìm thấy hơn.">
      <FormField label="Tên hiển thị" value={draft.displayName} onChangeText={(value) => update('displayName', value)}
        maxLength={80} showCharacterCount error={errors.displayName} placeholder="Tên mọi người sẽ nhìn thấy" />
      <SingleChoiceField label="Giới tính" options={GENDER_OPTIONS} value={draft.gender}
        onChange={(value) => update('gender', value)} error={errors.gender} searchable={false} />
      <DateField label="Ngày sinh riêng tư" value={draft.dateOfBirth} onChange={(value) => update('dateOfBirth', value)}
        maximumDate={dateLimits.maximum} minimumDate={dateLimits.minimum} error={errors.dateOfBirth} />
    </Section>

    <Section title="Giới thiệu" description="Chia sẻ vừa đủ để một người phù hợp có lý do bắt đầu trò chuyện.">
      <FormField label="Giới thiệu về bạn" value={draft.bio} onChangeText={(value) => update('bio', value)}
        multiline textAlignVertical="top" style={styles.multiline} maxLength={500} showCharacterCount error={errors.bio}
        placeholder="Sở thích, lối sống hoặc điều bạn đang tìm kiếm…" />
      <AiBioAssistant bio={draft.bio} interests={draft.interests} onUseBio={(value) => update('bio', value)} />
      <SingleChoiceField label="Nghề nghiệp" options={OCCUPATION_OPTIONS} value={occupationChoice}
        onChange={(value) => { setCustomOccupation(value === '__other__'); update('occupation', value === '__other__' ? '' : value); }} error={errors.occupation} />
      {occupationChoice === '__other__' ? <AnimatedSection><FormField label="Nghề nghiệp của bạn" value={draft.occupation}
        onChangeText={(value) => update('occupation', value)} maxLength={120} showCharacterCount error={errors.occupation} /></AnimatedSection> : null}
      <SingleChoiceField label="Học vấn" options={EDUCATION_OPTIONS} value={draft.education}
        onChange={(value) => update('education', value)} error={errors.education} searchable={false} />
    </Section>

    <Section title="Sở thích và ngôn ngữ" description="Bạn có thể chọn nhiều mục và bỏ chọn trực tiếp trên chip.">
      <MultiChoiceField label="Sở thích" options={interestOptions} values={draft.interests}
        onChange={(values) => update('interests', values)} error={errors.interests}
        helperText={interestOptions.length ? undefined : 'Chưa có danh mục sở thích từ máy chủ.'} />
      <MultiChoiceField label="Ngôn ngữ" options={LANGUAGE_OPTIONS} values={draft.languages}
        onChange={(values) => update('languages', values)} error={errors.languages} />
    </Section>

    <Section title="Vị trí và quyền riêng tư" description="Khu vực công khai là thông tin thô. Tọa độ GPS luôn được giữ riêng tư.">
      <SingleChoiceField label="Khu vực công khai" options={LOCATION_OPTIONS} value={locationChoice}
        onChange={(value) => { setCustomLocation(value === '__other__'); update('publicLocation', value === '__other__' ? '' : value); }} error={errors.publicLocation} />
      {locationChoice === '__other__' ? <AnimatedSection><FormField label="Khu vực của bạn" value={draft.publicLocation}
        onChangeText={(value) => update('publicLocation', value)} maxLength={120} showCharacterCount error={errors.publicLocation}
        placeholder="Chỉ ghi tỉnh/thành phố hoặc khu vực chung" /></AnimatedSection> : null}
      <LocationConsentField value={draft.locationConsent} onChange={setLocationConsent}
        disabled={saving} hasCoordinates={draft.latitude !== null && draft.longitude !== null} />
      {draft.locationConsent ? <AppButton label="Cập nhật vị trí hiện tại" variant="secondary" disabled={saving}
        onPress={() => void requestLocation()} /> : null}
    </Section>

    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    <UnsavedChangesDialog visible={pendingNavigation !== undefined} onKeepEditing={() => setPendingNavigation(undefined)}
      onDiscard={() => {
        const action = pendingNavigation;
        setPendingNavigation(undefined);
        if (action) {
          allowNextNavigation.current = true;
          navigation.dispatch(action);
        }
      }} />
  </Screen>;
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <AnimatedSection><View style={styles.section}>
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionBody}>{description}</Text></View>
    {children}
  </View></AnimatedSection>;
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs }, title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted },
  section: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.lg, gap: spacing.md },
  sectionHeading: { gap: spacing.xs }, sectionTitle: { ...type.subtitle, color: colors.ink }, sectionBody: { ...type.caption, color: colors.inkMuted },
  multiline: { minHeight: 132, paddingTop: spacing.md }, error: { ...type.body, color: colors.danger },
});
