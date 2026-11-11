import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';
import { getProfileImageSource } from '../../shared/utils/avatarHelper';

type MatchPeople = {
  other: ProfilePublic;
  mine: ProfilePublic;
  otherPhoto?: string;
  myPhoto?: string;
};

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
        otherPhoto: otherUrl?.ok ? otherUrl.data : undefined,
        myPhoto: myUrl?.ok ? myUrl.data : undefined,
      });
    });
    return () => {
      live = false;
    };
  }, [matchId, services]);

  if (!matchId) {
    return (
      <Screen safeTop>
        <StatePanel
          title="Chưa có match được xác nhận"
          description="Match chỉ xuất hiện sau khi cả hai bạn cùng thích nhau."
        />
        <AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const names = people ? `${people.mine.displayName} & ${people.other.displayName}` : 'Một kết nối mới';

  return (
    <Screen scroll={false} safeTop contentStyle={styles.screen}>
      <AnimatedSection>
        <View style={styles.intro}>
          <AppText accessibilityRole="header" tone="onPrimary" style={styles.title}>
            It&apos;s a Match!
          </AppText>
          <AppText tone="onPrimary" style={styles.copy}>
            Hai bạn đã cùng chọn nhau rồi đấy.
          </AppText>
        </View>
      </AnimatedSection>

      <AnimatedSection>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={people ? `Kết nối giữa ${names}` : 'Kết nối mới được xác nhận'}
          style={styles.portraits}
        >
          <View style={[styles.portrait, styles.otherPortrait]}>
            <Image
              accessibilityLabel={`Ảnh của ${people?.other.displayName ?? 'Người bạn kết nối'}`}
              source={getProfileImageSource(
                people?.otherPhoto,
                people?.other.id ?? 'match-other',
                people?.other.gender ?? 'woman',
              )}
              style={styles.portraitImage}
              resizeMode="cover"
            />
          </View>
          <View style={[styles.portrait, styles.myPortrait]}>
            <Image
              accessibilityLabel={`Ảnh của ${people?.mine.displayName ?? 'Bạn'}`}
              source={getProfileImageSource(
                people?.myPhoto,
                people?.mine.id ?? 'match-mine',
                people?.mine.gender ?? 'man',
              )}
              style={styles.portraitImage}
              resizeMode="cover"
            />
          </View>
          <View pointerEvents="none" accessible={false} style={styles.heartSignal}>
            <AppIcon name="heart" color={colors.primary} size={36} />
          </View>
        </View>
      </AnimatedSection>

      <View style={styles.confirmationCopy}>
        <AppText tone="onPrimary" style={styles.names}>
          {names}
        </AppText>
        <AppText tone="onPrimary" style={styles.supporting}>
          Đừng ngại gửi một lời chào ngọt ngào ngay bây giờ!
        </AppText>
      </View>

      <View style={styles.actions}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Nhắn tin ngay"
          onPress={() => navigation.replace('Chat', { matchId })}
          style={styles.primaryAction}
        >
          <AppText style={styles.primaryActionText}>Nhắn tin ngay</AppText>
          <AppIcon name="send" color={colors.primaryPressed} size={20} />
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Tiếp tục khám phá"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Discover' })}
          rippleColor="rgba(255,255,255,0.22)"
          style={styles.quietAction}
        >
          <AppText style={styles.quietActionText}>Tiếp tục khám phá</AppText>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.primaryPressed,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  intro: { gap: spacing.xs, alignItems: 'center' },
  title: { fontFamily: fonts.extrabold, fontSize: 42, lineHeight: 48, textAlign: 'center' },
  copy: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, opacity: 0.9, textAlign: 'center' },
  portraits: {
    height: 310,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  portrait: {
    width: 174,
    height: 236,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.surface,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  otherPortrait: { position: 'absolute', left: 16, top: 18, transform: [{ rotate: '-6deg' }] },
  myPortrait: { position: 'absolute', right: 16, bottom: 18, transform: [{ rotate: '6deg' }] },
  portraitImage: { width: '100%', height: '100%' },
  heartSignal: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmationCopy: { gap: spacing.xs, alignItems: 'center', paddingHorizontal: spacing.md },
  names: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, textAlign: 'center' },
  supporting: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, textAlign: 'center', opacity: 0.88 },
  actions: { gap: spacing.sm },
  primaryAction: {
    minHeight: 54,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionText: { fontFamily: fonts.bold, fontSize: 16, color: colors.primaryPressed },
  quietAction: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietActionText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
});
