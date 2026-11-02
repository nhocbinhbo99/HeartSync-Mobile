import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
//
// Do not initialize LiveKit here: Expo Go does not bundle its native WebRTC
// module. Initialize LiveKit only from the native calling flow in a development
// build, before a call is started.
registerRootComponent(App);
