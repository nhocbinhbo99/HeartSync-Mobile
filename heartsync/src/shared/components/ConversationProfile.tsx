import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppServices } from '../../services/AppServicesProvider';
import type { ProfilePublic } from '../types/domain.types';
import { colors, fonts } from '../theme/tokens';
import { getProfileImageSource } from '../utils/avatarHelper';

export function ConversationProfile({
  profileId,
  presentation = 'inline',
}: {
  profileId: string;
  presentation?: 'inline' | 'hero' | 'callHero' | 'callTile' | 'avatar';
}) {
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [url, setUrl] = useState('');

  useEffect(() => {
    let live = true;
    void services?.profile.getPublic(profileId).then(async (r) => {
      if (!live || !r.ok) return;
      setProfile(r.data);
      const primary = r.data.photos.find((p) => p.isPrimary) ?? r.data.photos[0];
      if (primary) {
        const result = await services.profile.createPhotoUrl(primary.storagePath);
        if (live && result.ok) setUrl(result.data);
      }
    });
    return () => {
      live = false;
    };
  }, [services, profileId]);

  const avatarOnly = presentation === 'avatar' || presentation === 'callTile';
  const hero = presentation === 'hero' || presentation === 'callHero';
  const avatarSize = hero ? 116 : presentation === 'callTile' ? 64 : avatarOnly ? 46 : 48;
  const imageSource = getProfileImageSource(url, profileId, profile?.gender);

  const content = (
    <View style={{ flexDirection: hero ? 'column' : 'row', alignItems: 'center', gap: hero ? 14 : 10 }}>
      <Image
        source={imageSource}
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          borderWidth: hero ? 3 : 1.5,
          borderColor: hero ? 'rgba(255,255,255,0.85)' : colors.border,
          backgroundColor: colors.surfaceMuted,
        }}
      />
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
        <Image source={imageSource} blurRadius={28} resizeMode="cover" style={styles.callHeroBackdrop} />
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
