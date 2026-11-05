import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { useAppServices } from "../../services/AppServicesProvider";
import type { ProfilePublic } from "../types/domain.types";
import { colors } from "../theme/tokens";
export function ConversationProfile({ profileId }: { profileId: string }) {
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
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: 48, height: 48, borderRadius: 24 }}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.primarySoft,
          }}
        />
      )}
      <Text style={{ fontSize: 20, color: colors.ink }}>
        {profile?.displayName ?? "Người bạn kết nối"}
      </Text>
    </View>
  );
}
