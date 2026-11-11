import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { randomUUID } from "expo-crypto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ConversationProfile } from "../../shared/components/ConversationProfile";
import { useAuth } from "../auth/AuthProvider";
import { useAppServices } from "../../services/AppServicesProvider";
import { dedupeMessages } from "../../shared/domain/messages";
import { IconButton } from "../../shared/components/IconButton";
import { AppText } from "../../shared/components/AppText";
import { Screen } from "../../shared/components/Screen";
import type { RootStackParamList } from "../../navigation/types";
import { colors, radii, spacing } from "../../shared/theme/tokens";
import type { ChatMessage } from "../../shared/types/domain.types";

type Message = ChatMessage & { delivery?: "sending" | "failed" };
export function ChatScreen(
  props: NativeStackScreenProps<RootStackParamList, "Chat">,
) {
  return <Conversation key={props.route.params?.matchId} {...props} />;
}
function Conversation({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Chat">) {
  const services = useAppServices();
  const { user } = useAuth();
  const matchId = route.params?.matchId;
  const focused = useIsFocused();
  const focus = useRef(focused);
  useEffect(() => {
    focus.current = focused;
  }, [focused]);
  const subscriptionRef = useRef<{ unsubscribe(): void } | null>(null);
  const alive = useRef(true);
  const appActive = useRef(AppState.currentState === "active");
  const [messages, setMessages] = useState<Message[]>([]);
  const current = useRef(messages);
  useEffect(() => {
    current.current = messages;
  }, [messages]);
  const [recipient, setRecipient] = useState<{ id: string; displayName: string } | null>(null);
  useEffect(() => {
    let live = true;
    if (services && matchId)
      void services.chat.getRecipient(matchId).then((r) => {
        if (live && r.ok) setRecipient({ id: r.data.id, displayName: r.data.displayName });
      });
    return () => {
      live = false;
    };
  }, [services, matchId]);
  const [text, setText] = useState("");
  const [darkAppearance, setDarkAppearance] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const loadingOlder = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const callStarting = useRef(false);
  const visible = useRef<string[]>([]);
  const merge = useCallback((items: ChatMessage[]) => {
    if (!alive.current) return;
    setMessages((old) =>
      dedupeMessages([...old, ...items])
        .map((m) => ({
          ...m,
          delivery: m.id.startsWith("local:")
            ? old.find((o) => o.id === m.id)?.delivery
            : undefined,
        }))
        .sort(
          (a, b) =>
            Date.parse(b.sentAt) - Date.parse(a.sentAt) || b.id.localeCompare(a.id),
        ),
    );
  }, []);
  const markVisible = useCallback(() => {
    if (!services || !matchId || !focus.current || !appActive.current) return;
    const ids = current.current
      .filter(
        (m) =>
          visible.current.includes(m.id) &&
          m.senderId !== user?.id &&
          !m.readAt,
      )
      .map((m) => m.id);
    if (ids.length)
      void services.chat.markRead(matchId, ids).then((r) => {
        if (!r.ok && alive.current) setError(r.error.message);
      });
  }, [services, matchId, user?.id]);
  const refresh = useCallback(async () => {
    if (!services || !matchId) {
      setLoading(false);
      return;
    }
    const active = await services.chat.isActive(matchId);
    if (!alive.current) return;
    if (!active.ok && active.error.code === 'forbidden') {
      setEnabled(false); setMessages([]); setError('Cuộc trò chuyện không còn khả dụng.'); subscriptionRef.current?.unsubscribe(); setLoading(false); return;
    }
    if (active.ok) { setEnabled(active.data); if (!active.data) subscriptionRef.current?.unsubscribe(); }
    let next: string | undefined;
    const known = new Set(
      current.current.filter((m) => !m.delivery).map((m) => m.id),
    );
    do {
      const result = await services.chat.listMessages(matchId, next);
      if (!alive.current) return;
      if (!result.ok) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      merge(result.data.items);
      if (!next && current.current.length === 0)
        setCursor(result.data.nextCursor);
      if (
        !known.size ||
        result.data.items.some((m) => m.id === [...known].at(-1))
      )
        break;
      next = result.data.nextCursor ?? undefined;
    } while (next);
    setLoading(false);
  }, [services, matchId, merge]);
  useEffect(() => {
    alive.current = true;
    const sub =
      services && matchId
        ? services.chat.subscribe(
            matchId,
            (m) => merge([m]),
            (e) => setError(e.message),
          )
        : null;
    subscriptionRef.current = sub;
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (appActive.current) void refresh();
    }, 5000);
    const state = AppState.addEventListener("change", (s) => {
      appActive.current = s === "active";
      if (s === "active") {
        void refresh();
        markVisible();
      }
    });
    return () => {
      alive.current = false;
      clearTimeout(initial);
      clearInterval(timer);
      sub?.unsubscribe();
      state.remove();
    };
  }, [services, matchId, refresh, merge, markVisible]);
  useEffect(() => {
    if (focused) markVisible();
  }, [focused, markVisible]);
  const send = async (message: Message) => {
    if (!services || !matchId || !enabled) return;
    setMessages((old) =>
      old.map((m) => (m.id === message.id ? { ...m, delivery: "sending" } : m)),
    );
    const result = await services.chat.sendMessage({
      matchId,
      clientMessageId: message.clientMessageId,
      content: message.content,
    });
    if (!alive.current) return;
    if (result.ok) {
      merge([result.data]);
      setError("");
    } else {
      setMessages((old) =>
        old.map((m) =>
          m.clientMessageId === message.clientMessageId &&
          m.id.startsWith("local:")
            ? { ...m, delivery: "failed" }
            : m,
        ),
      );
      setError(result.error.message);
      if (result.error.code === "forbidden") setEnabled(false);
    }
  };
  const submit = () => {
    if (!user || !matchId || !text.trim()) return;
    const id = randomUUID();
    const message: Message = {
      id: `local:${id}`,
      clientMessageId: id,
      matchId,
      senderId: user.id,
      content: text.trim(),
      sentAt: new Date().toISOString(),
      readAt: null,
      delivery: "sending",
    };
    setMessages((old) => [message, ...old]);
    setText("");
    void send(message);
  };
  const startCall = async (type: "audio" | "video") => {
    if (!services || !matchId || !enabled || callStarting.current) return;
    callStarting.current = true;
    setStartingCall(true);
    try {
      const result = type === "video"
        ? await services.calls.startVideoCall(matchId)
        : await services.calls.startAudioCall(matchId);
      if (!alive.current) return;
      if (result.ok) navigation.navigate(type === "video" ? "VideoCall" : "AudioCall", {
        matchId, callId: result.data.id,
      });
      else setError(result.error.message);
    } catch {
      if (alive.current) setError("Không thể bắt đầu cuộc gọi. Hãy thử lại.");
    } finally {
      callStarting.current = false;
      if (alive.current) setStartingCall(false);
    }
  };
  const older = async () => {
    if (!services || !matchId || !cursor || loadingOlder.current) return;
    loadingOlder.current = true;
    const r = await services.chat.listMessages(matchId, cursor);
    loadingOlder.current = false;
    if (!alive.current) return;
    if (r.ok) {
      merge(r.data.items);
      setCursor(r.data.nextCursor);
    } else setError(r.error.message);
  };
  const [viewability] = useState({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 300,
  });
  const visibleCallback = ({
    viewableItems,
  }: {
    viewableItems: { item: Message }[];
  }) => {
    visible.current = viewableItems.map((i) => i.item.id);
    markVisible();
  };
  if (!matchId || !services)
    return (
      <Screen safeTop>
        <AppText>Chưa thể mở cuộc trò chuyện.</AppText>
      </Screen>
    );
  const palette = darkAppearance
    ? { background: '#351020', surface: '#642743', incoming: '#4A3E45', text: '#FFF7F9', muted: '#E5CAD5', border: '#7B3A58', composer: '#642743', input: '#4A3E45' }
    : { background: colors.background, surface: colors.surface, incoming: colors.surface, text: colors.ink, muted: colors.inkMuted, border: colors.border, composer: colors.surface, input: colors.surfaceMuted };
  const composer = <View style={styles.composer}>
    <TextInput accessibilityLabel="Tin nhắn" value={text} onChangeText={setText} multiline maxLength={4000}
      placeholder="Nhắn gì đó thật tự nhiên…" placeholderTextColor={colors.inkMuted} editable={enabled}
      style={[styles.composerInput, { backgroundColor: palette.input, color: palette.text }]} />
    <IconButton icon="send" label="Gửi tin nhắn" tone="onPrimary" disabled={!text.trim() || !enabled} onPress={submit} style={styles.sendButton} />
  </View>;
  return (
    <Screen scroll={false} keyboardAware safeTop footer={<View style={[styles.composerShell, { backgroundColor: palette.composer, borderTopColor: palette.border }]}>{composer}</View>} contentStyle={{ ...styles.screen, backgroundColor: palette.background }}>
      <View style={[styles.chatHeader, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <IconButton icon="back" label="Quay lại kết nối" tone={darkAppearance ? "onPrimary" : "default"} onPress={() => navigation.goBack()} />
        {recipient ? <ConversationProfile profileId={recipient.id} presentation="avatar" /> : null}
        <View style={styles.headerCopy}><AppText numberOfLines={1} variant="title" style={{ color: palette.text }}>{recipient?.displayName ?? "Trò chuyện"}</AppText><AppText variant="caption" tone="success">Đã kết nối</AppText></View>
        <IconButton icon="phone" label="Gọi thoại" tone={darkAppearance ? "onPrimary" : "primary"} disabled={!enabled || startingCall} onPress={() => void startCall("audio")} />
        <IconButton icon="video" label="Gọi video" tone={darkAppearance ? "onPrimary" : "primary"} disabled={!enabled || startingCall} onPress={() => void startCall("video")} />
        <IconButton icon="moon" label={darkAppearance ? "Dùng giao diện sáng" : "Dùng giao diện tối"} tone={darkAppearance ? "onPrimary" : "primary"} onPress={() => setDarkAppearance((value) => !value)} />
      </View>
      {error ? (
        <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <FlatList
        style={[styles.messageList, { backgroundColor: palette.background }]}
        contentContainerStyle={styles.messageContent}
        data={messages}
        inverted
        keyExtractor={(m) => m.id}
        refreshing={loading}
        onRefresh={() => void refresh()}
        onEndReached={() => void older()}
        onEndReachedThreshold={0.3}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 40,
        }}
        viewabilityConfig={viewability}
        onViewableItemsChanged={visibleCallback}
        ListEmptyComponent={
          <AppText tone="muted" style={[styles.empty, { color: palette.muted }]}>
            {loading ? "Đang tải…" : "Hãy bắt đầu bằng một lời chào."}
          </AppText>
        }
        renderItem={({ item, index }) => {
          const mine = item.senderId === user?.id;
          const date = new Date(item.sentAt).toLocaleDateString();
          const prior = messages[index + 1];
          return (
            <View>
              {!prior ||
              new Date(prior.sentAt).toLocaleDateString() !== date ? (
                <AppText variant="caption" tone="muted" style={[styles.day, { color: palette.muted }]}>{date}</AppText>
              ) : null}
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs, { backgroundColor: mine ? colors.primary : palette.incoming }]}>
                <AppText style={[styles.content, { color: mine ? colors.onPrimary : palette.text }]}>{item.content}</AppText>
                <AppText variant="caption" tone="muted" style={[styles.caption, { color: mine ? colors.onPrimary : palette.muted, opacity: mine ? 0.8 : 1 }]}>
                  {new Date(item.sentAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  {mine
                    ? item.delivery === "sending"
                      ? " · Đang gửi"
                      : item.delivery === "failed"
                        ? " · Gửi lỗi"
                        : item.readAt
                          ? " · Đã đọc"
                          : " · Đã gửi"
                    : ""}
                </AppText>
                {item.delivery === "failed" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void send(item)}
                    style={{ minHeight: 48, justifyContent: "center" }}
                  >
                    <Text>Gửi lại</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { padding: 0, gap: 0 },
  chatHeader: { minHeight: 76, paddingHorizontal: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  headerCopy: { flex: 1, minWidth: 0, gap: 2 },
  messageList: { flex: 1, backgroundColor: colors.background },
  messageContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.xs, flexGrow: 1 },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    marginVertical: 4,
  },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface },
  content: { color: colors.ink, fontSize: 16 },
  caption: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  day: { textAlign: "center", color: colors.inkMuted, marginVertical: 10 },
  error: { color: colors.danger, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  empty: { padding: spacing.lg, textAlign: "center" },
  composerShell: { borderTopWidth: 1 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  composerInput: { flex: 1, minHeight: 52, maxHeight: 120, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, color: colors.ink, fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textAlignVertical: "center" },
  sendButton: { backgroundColor: colors.primary, width: 52, height: 52 },
});
