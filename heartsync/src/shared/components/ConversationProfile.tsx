import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useAppServices } from "../../services/AppServicesProvider";
import type { ProfilePublic } from "../types/domain.types";
import { colors } from "../theme/tokens";
export function ConversationProfile({ profileId, presentation = "inline" }: { profileId: string; presentation?: "inline" | "hero" | "callHero" | "callTile" | "avatar" }) {
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [url, setUrl] = useState("");
  useEffect(() => {
    let live = true;
    void services?.profile.getPublic(profileId).then(async (r) => {
      if (!live || !r.ok) return;
      setProfile(r.data);
      const path = r.data.photos[0]?.storagePath;
      if (path) {
        const result = await services.profile.createPhotoUrl(path);
        if (live && result.ok) setUrl(result.data);
      }
    });
    return () => {
      live = false;
    };
  }, [services, profileId]);
  const avatarOnly = presentation === "avatar" || presentation === "callTile";
  const hero = presentation === "hero" || presentation === "callHero";
  const avatarSize = hero ? 112 : presentation === "callTile" ? 64 : avatarOnly ? 72 : 48;
  const content = (
    <View style={{ flexDirection: hero ? "column" : "row", alignItems: "center", gap: hero ? 16 : 12 }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
        />
      ) : (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: colors.primarySoft,
          }}
        />
      )}
      {!avatarOnly ? <Text style={{ fontSize: hero ? 24 : 20, fontWeight: hero ? "700" : "400", color: colors.ink }}>
        {profile?.displayName ?? "Người bạn kết nối"}
      </Text> : null}
    </View>
  );
  if (presentation === "callHero" || presentation === "callTile")
    return (
      <View style={styles.callHero}>
        {url ? <Image source={{ uri: url }} blurRadius={28} resizeMode="cover" style={styles.callHeroBackdrop} /> : <View style={styles.callHeroFallback} />}
        <View style={styles.callHeroScrim} />
        <View style={styles.callHeroContent}>{content}</View>
      </View>
    );
  return content;
}

const styles = StyleSheet.create({
  callHero: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  callHeroBackdrop: { ...StyleSheet.absoluteFill, opacity: 0.66, transform: [{ scale: 1.12 }] },
  callHeroFallback: { ...StyleSheet.absoluteFill, backgroundColor: colors.primarySoft },
  callHeroScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(54,17,42,0.52)" },
  callHeroContent: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
});
