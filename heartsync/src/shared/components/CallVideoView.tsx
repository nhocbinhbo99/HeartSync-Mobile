import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** Native renderer boundary: feature screens only receive opaque media handles. */
export function CallVideoView({
  track,
  style,
  mirror,
  zOrder,
  preview = false,
}: {
  track: unknown;
  style: StyleProp<ViewStyle>;
  mirror?: boolean;
  zOrder: number;
  preview?: boolean;
}) {
  // Keep the native renderer lazy like the gateway; old development APKs can still open the app.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { VideoTrack, VideoView } = require('@livekit/react-native') as typeof import('@livekit/react-native');
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const hasRoundedFrame = typeof flatStyle.borderRadius === 'number' && flatStyle.borderRadius > 0;

  return (
    <View style={[styles.clipContainer, style]}>
      {preview ? (
        <VideoView
          videoTrack={track as React.ComponentProps<typeof VideoView>['videoTrack']}
          style={styles.innerVideo}
          mirror={mirror}
          zOrder={zOrder}
        />
      ) : (
        <VideoTrack
          trackRef={track as React.ComponentProps<typeof VideoTrack>['trackRef']}
          style={styles.innerVideo}
          mirror={mirror}
          zOrder={zOrder}
        />
      )}
      {hasRoundedFrame ? (
        <>
          <View pointerEvents="none" style={styles.cornerMaskOuter} />
          <View pointerEvents="none" style={styles.innerFrameRing} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clipContainer: {
    overflow: 'hidden',
  },
  innerVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  cornerMaskOuter: {
    position: 'absolute',
    top: -6,
    right: -6,
    bottom: -6,
    left: -6,
    borderRadius: 24,
    borderWidth: 8,
    borderColor: '#1E141C',
  },
  innerFrameRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
});
