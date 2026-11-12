import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { CachedImage } from '../../shared/components/CachedImage';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, radii, spacing } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

type ResolvedPhoto = { storagePath: string; url: string };
type MatchPeople = { other: ProfilePublic; mine: ProfilePublic; otherPhoto?: ResolvedPhoto; myPhoto?: ResolvedPhoto };

export function MatchFoundScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'MatchFound'>) {
  const services = useAppServices();
  const matchId = route.params?.matchId;
  const [people, setPeople] = useState<MatchPeople>();

  useEffect(() => {
    let live = true;
    if (!services || !matchId) return () => { live = false; };
    void Promise.all([services.matches.listMatches(), services.profile.getMine()]).then(async ([matches, mine]) => {
      if (!live || !matches.ok || !mine.ok) return;
      const match = matches.data.items.find((item) => item.id === matchId);
      if (!match) return;
      const otherPath = (match.otherProfile.photos.find((photo) => photo.isPrimary) ?? match.otherProfile.photos[0])?.storagePath;
      const myPath = (mine.data.public.photos.find((photo) => photo.isPrimary) ?? mine.data.public.photos[0])?.storagePath;
      const [otherUrl, myUrl] = await Promise.all([
        otherPath ? services.profile.createPhotoUrl(otherPath) : Promise.resolve(undefined),
        myPath ? services.profile.createPhotoUrl(myPath) : Promise.resolve(undefined),
      ]);
      if (!live) return;
      setPeople({
        other: match.otherProfile,
        mine: mine.data.public,
        otherPhoto: otherPath && otherUrl?.ok ? { storagePath: otherPath, url: otherUrl.data } : undefined,
        myPhoto: myPath && myUrl?.ok ? { storagePath: myPath, url: myUrl.data } : undefined,
      });
    });
    return () => { live = false; };
  }, [matchId, services]);

  if (!matchId) return <Screen><StatePanel title="Chưa có match được xác nhận" description="Match chỉ xuất hiện sau khi máy chủ xác nhận mutual like." /><AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} /></Screen>;
  const names = people ? `${people.mine.displayName} × ${people.other.displayName}` : 'Một kết nối mới';

  return <Screen scroll={false} safeTop contentStyle={styles.screen}>
    <View style={styles.intro}>
      <AppText accessibilityRole="header" tone="onPrimary" style={styles.title}>Đã kết nối!</AppText>
      <AppText tone="onPrimary" style={styles.copy}>Hai người đã cùng chọn nhau.</AppText>
    </View>
    <View accessible accessibilityRole="image" accessibilityLabel={people ? `Kết nối giữa ${names}` : 'Kết nối mới được xác nhận'} style={styles.portraits}>
      <Portrait photoUrl={people?.otherPhoto} label={people?.other.displayName ?? 'Người bạn kết nối'} style={styles.otherPortrait} />
      <Portrait photoUrl={people?.myPhoto} label={people?.mine.displayName ?? 'Hồ sơ của bạn'} style={styles.myPortrait} />
      <View pointerEvents="none" accessible={false} style={styles.heartSignal}><AppIcon name="heartOutline" color={colors.primary} size={44} /></View>
    </View>
    <View style={styles.confirmationCopy}>
      <AppText tone="onPrimary" style={styles.names}>{names}</AppText>
      <AppText tone="onPrimary" style={styles.supporting}>Đừng ngại gửi một lời chào đầu tiên.</AppText>
    </View>
    <View style={styles.actions}>
      <AppButton label="Bắt đầu trò chuyện" trailingIcon="send" onPress={() => navigation.replace('Chat', { matchId })} style={styles.primaryAction} />
      <AppButton label="Tiếp tục khám phá" variant="quiet" onPress={() => navigation.navigate('MainTabs', { screen: 'Discover' })} style={styles.quietAction} />
    </View>
  </Screen>;
}

function Portrait({ photoUrl, label, style }: { photoUrl?: ResolvedPhoto; label: string; style: object }) {
  return <View style={[styles.portrait, style]}>
    {photoUrl ? <CachedImage accessibilityLabel={`Ảnh của ${label}`} source={{ uri: photoUrl.url, cacheKey: photoUrl.storagePath }} recyclingKey={photoUrl.storagePath} style={styles.portraitImage} /> : <View accessibilityRole="image" accessibilityLabel={`Ảnh của ${label} chưa có`} style={styles.portraitFallback}><AppIcon name="heartOutline" color={colors.primarySoft} size={42} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.primaryPressed, paddingHorizontal: 28, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: 0 },
  intro: { gap: spacing.sm },
  title: { fontSize: 56, lineHeight: 64, fontWeight: '700', letterSpacing: -1.4 },
  copy: { fontSize: 27, lineHeight: 35, opacity: 0.86 },
  portraits: { flex: 1, minHeight: 360, maxHeight: 510, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  portrait: { width: 216, height: 286, borderRadius: 36, overflow: 'hidden', backgroundColor: colors.primarySoft },
  otherPortrait: { position: 'absolute', left: 20, top: '13%', transform: [{ rotate: '-3deg' }] },
  myPortrait: { position: 'absolute', right: 14, bottom: '9%', transform: [{ rotate: '3deg' }] },
  portraitImage: { width: '100%', height: '100%' },
  portraitFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  heartSignal: { width: 102, height: 102, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  confirmationCopy: { gap: spacing.md, paddingBottom: spacing.xl },
  names: { fontSize: 32, lineHeight: 40, fontWeight: '700', textAlign: 'center' },
  supporting: { fontSize: 18, lineHeight: 27, textAlign: 'center', opacity: 0.84 },
  actions: { gap: spacing.sm },
  primaryAction: { minHeight: 62, backgroundColor: '#FF4D7D', borderColor: '#FF4D7D', borderRadius: 22 },
  quietAction: { minHeight: 52, borderColor: 'rgba(255,255,255,0.32)' },
});
