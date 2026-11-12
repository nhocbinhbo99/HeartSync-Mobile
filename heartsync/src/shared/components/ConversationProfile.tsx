import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAppServices } from '../../services/AppServicesProvider';
import { getCachedPhotoUrl, getCachedPublicProfile } from '../../services/photoCache';
import { colors, fonts } from '../theme/tokens';
import type { ProfilePublic } from '../types/domain.types';
import { getProfileImageSource } from '../utils/avatarHelper';

export function ConversationProfile({
  profileId,
  profile: initialProfile,
  presentation = 'inline',
}: {
  profileId: string;
  profile?: ProfilePublic;
  presentation?: 'inline' | 'hero' | 'callHero' | 'callTile' | 'avatar';
}) {
  const services = useAppServices();
  const [loadedProfile, setLoadedProfile] = useState<ProfilePublic>();
  const profile =
    initialProfile ??
    (loadedProfile?.id === profileId ? loadedProfile : undefined) ??
    getCachedPublicProfile(profileId);
  const primaryPath =
    profile?.photos.find((p) => p.isPrimary)?.storagePath ?? profile?.photos[0]?.storagePath;

  const [fetchedUrl, setFetchedUrl] = useState<{ path: string; url: string }>();
  const resolvedUrl =
    getCachedPhotoUrl(primaryPath) ??
    (fetchedUrl && fetchedUrl.path === primaryPath ? fetchedUrl.url : '');

  useEffect(() => {
    if (initialProfile || getCachedPublicProfile(profileId) || !services) return undefined;
    let live = true;
    void services.profile.getPublic(profileId).then((r) => {
      if (live && r.ok) setLoadedProfile(r.data);
    });
    return () => {
      live = false;
    };
  }, [initialProfile, profileId, services]);

  useEffect(() => {
    if (!services || !primaryPath || getCachedPhotoUrl(primaryPath)) return undefined;
    let live = true;
    void services.profile.createPhotoUrl(primaryPath).then((result) => {
      if (live && result.ok) setFetchedUrl({ path: primaryPath, url: result.data });
    });
    return () => {
      live = false;
    };
  }, [primaryPath, services]);

  const avatarOnly = presentation === 'avatar' || presentation === 'callTile';
  const hero = presentation === 'hero' || presentation === 'callHero';
  const avatarSize = hero ? 116 : presentation === 'callTile' ? 64 : avatarOnly ? 46 : 48;
  const canRenderImage = Boolean(profile && (resolvedUrl || !primaryPath));
  const imageSource = canRenderImage
    ? getProfileImageSource(
        resolvedUrl || undefined,
        profileId,
        profile?.gender,
        profile?.displayName,
      )
    : undefined;
  const imageKey = resolvedUrl || (primaryPath ? 'pending' : `fallback-${profileId}`);
  const avatarFrameStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    borderWidth: hero ? 3 : 1.5,
    borderColor: hero ? 'rgba(255,255,255,0.85)' : colors.border,
    backgroundColor: colors.surfaceMuted,
  };

  const content = (
    <View style={{ flexDirection: hero ? 'column' : 'row', alignItems: 'center', gap: hero ? 14 : 10 }}>
      {imageSource ? (
        <Image key={imageKey} source={imageSource} fadeDuration={0} style={avatarFrameStyle} />
      ) : (
        <View style={avatarFrameStyle} />
      )}
      {!avatarOnly ? (
        <Text
          style={{
            fontFamily: hero ? fonts.bold : fonts.semibold,
            fontSize: hero ? 24 : 18,
            color: presentation === 'callHero' ? colors.onPrimary : colors.ink,
          }}
        >
          {profile?.displayName ?? 'Người bạn kết nối'}
        </Text>
      ) : null}
    </View>
  );

  if (presentation === 'callHero' || presentation === 'callTile') {
    return (
      <View style={styles.callHero}>
        {imageSource ? (
          <Image key={`backdrop-${imageKey}`} source={imageSource} fadeDuration={0} blurRadius={28} resizeMode="cover" style={styles.callHeroBackdrop} />
        ) : null}
        <View style={styles.callHeroScrim} />
        <View style={styles.callHeroContent}>{content}</View>
      </View>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  callHero: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  callHeroBackdrop: { ...StyleSheet.absoluteFill, opacity: 0.72, transform: [{ scale: 1.15 }] },
  callHeroScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(54, 17, 42, 0.56)' },
  callHeroContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
});
