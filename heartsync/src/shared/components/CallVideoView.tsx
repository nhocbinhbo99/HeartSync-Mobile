import type { StyleProp, ViewStyle } from "react-native";

/** Native renderer boundary: feature screens only receive opaque media handles. */
export function CallVideoView({ track, style, mirror, zOrder }: {
  track: unknown;
  style: StyleProp<ViewStyle>;
  mirror?: boolean;
  zOrder: number;
}) {
  // Keep the native renderer lazy like the gateway; old development APKs can still open the app.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { VideoTrack } = require("@livekit/react-native") as typeof import("@livekit/react-native");
  return <VideoTrack
    trackRef={track as React.ComponentProps<typeof VideoTrack>["trackRef"]}
    style={style as ViewStyle}
    mirror={mirror}
    zOrder={zOrder}
  />;
}
