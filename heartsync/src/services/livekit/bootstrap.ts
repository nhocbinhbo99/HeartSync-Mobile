import { registerGlobals } from '@livekit/react-native';

let registered = false;

/** Must be called only from a native call flow, before constructing a LiveKit room. */
export function ensureLiveKitGlobals() {
  if (registered) return;
  registerGlobals();
  registered = true;
}
