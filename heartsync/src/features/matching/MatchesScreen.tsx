import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, FlatList, Image, Pressable, Text, View } from "react-native";
import {
  useIsFocused,
  type CompositeScreenProps,
} from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppServices } from "../../services/AppServicesProvider";
import { Screen } from "../../shared/components/Screen";
import { AppButton } from "../../shared/components/AppButton";
import type {
  MainTabParamList,
  RootStackParamList,
} from "../../navigation/types";
import type { MatchSummary } from "../../shared/types/domain.types";
import { colors } from "../../shared/theme/tokens";
type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Matches">,
  NativeStackScreenProps<RootStackParamList>
>;
export function MatchesScreen({ navigation }: Props) {
  const services = useAppServices();
  const focused = useIsFocused();
  const [items, setItems] = useState<MatchSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const busy = useRef(false);
  const loadedCount = useRef(30);
  useEffect(() => { loadedCount.current = Math.max(30, items.length); }, [items.length]);
  const load = useCallback(
    async (next?: string) => {
      if (!services || busy.current) return;
      busy.current = true;
      setLoading(true);
      const r = await services.matches.listMatches(next);
      if (r.ok && !next) {
        while (r.data.nextCursor && r.data.items.length < loadedCount.current) {
          const page = await services.matches.listMatches(r.data.nextCursor);
          if (!page.ok) break;
          r.data.items.push(...page.data.items);
          r.data.nextCursor = page.data.nextCursor;
        }
      }
      busy.current = false;
      setLoading(false);
      if (r.ok) {
        setError("");
        setCursor(r.data.nextCursor);
        setItems((old) =>
          next
            ? [
                ...old,
                ...r.data.items.filter((m) => !old.some((o) => o.id === m.id)),
              ]
            : r.data.items,
        );
      } else setError(r.error.message);
    },
    [services],
  );
  useEffect(() => {
    if (!focused) return;
    const sub = services?.chat.subscribeInbox(() => void load());
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void load();
    }, 5000);
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") void load();
    });
    return () => {
      sub?.unsubscribe();
      clearTimeout(initial);
      clearInterval(timer);
      listener.remove();
    };
  }, [focused, load, services]);
  return (
    <Screen scroll={false}>
      {error ? (
        <>
          <Text style={{ color: colors.danger }}>{error}</Text>
          <AppButton label="Thử lại" onPress={() => void load()} />
        </>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        refreshing={loading}
        onRefresh={() => void load()}
        onEndReached={() => {
          if (cursor) void load(cursor);
        }}
        ListEmptyComponent={
          <Text>{loading ? "Đang tải kết nối…" : "Chưa có kết nối."}</Text>
        }
        ListHeaderComponent={
          <>
            <Text style={{ fontSize: 22, color: colors.ink }}>
              Kết nối gần đây
            </Text>
            <FlatList
              horizontal
              data={[...items]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 10)}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <Pressable
                  style={{ padding: 12, minWidth: 64 }}
                  onPress={() =>
                    navigation.navigate("Chat", { matchId: item.id })
                  }
                >
                  <Avatar match={item} />
                  <Text>{item.otherProfile.displayName}</Text>
                </Pressable>
              )}
            />
            <Text style={{ fontSize: 22, marginVertical: 16 }}>Trò chuyện</Text>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Chat", { matchId: item.id })}
            style={{
              flexDirection: "row",
              gap: 12,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Avatar match={item} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontWeight: "600", color: colors.ink }}>
                {item.otherProfile.displayName}
              </Text>
              <Text numberOfLines={1}>
                {item.lastMessagePreview || "Gửi lời chào đầu tiên"}
              </Text>
              <Text>
                {item.lastMessageAt
                  ? new Date(item.lastMessageAt).toLocaleString()
                  : ""}
              </Text>
            </View>
            {!!item.unreadCount && (
              <Text
                accessibilityLabel={`${item.unreadCount} tin chưa đọc`}
                style={{ color: colors.primary }}
              >
                {item.unreadCount}
              </Text>
            )}
          </Pressable>
        )}
      />
    </Screen>
  );
}
function Avatar({ match }: { match: MatchSummary }) {
  const services = useAppServices();
  const [url, setUrl] = useState("");
  const path = match.otherProfile.photos[0]?.storagePath;
  useEffect(() => {
    let live = true;
    if (path && services)
      void services.profile.createPhotoUrl(path).then((r) => {
        if (live && r.ok) setUrl(r.data);
      });
    return () => {
      live = false;
    };
  }, [path, services]);
  return url ? (
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
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text>{match.otherProfile.displayName.slice(0, 1)}</Text>
    </View>
  );
}
