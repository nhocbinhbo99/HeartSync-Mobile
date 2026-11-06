import type { StyleProp, ViewStyle } from "react-native";

/** Native renderer boundary: feature screens only receive opaque media handles. */
export function CallVideoView({ track, style, mirror, zOrder, preview = false }: {
  track: unknown;
  style: StyleProp<ViewStyle>;
  mirror?: boolean;
  zOrder: number;
  preview?: boolean;
}) {
  // Keep the native renderer lazy like the gateway; old development APKs can still open the app.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { VideoTrack, VideoView } = require("@livekit/react-native") as typeof import("@livekit/react-native");
  if (preview) return <VideoView videoTrack={track as React.ComponentProps<typeof VideoView>["videoTrack"]} style={style as ViewStyle} mirror={mirror} zOrder={zOrder} />;
  return <VideoTrack
    trackRef={track as React.ComponentProps<typeof VideoTrack>["trackRef"]}
    style={style as ViewStyle}
    mirror={mirror}
    zOrder={zOrder}
  />;
}
