import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AppServicesProvider } from '../services/AppServicesProvider';
import { SnackbarProvider } from '../shared/components/Snackbar';

export function AppProviders({ children }: PropsWithChildren) {
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><StatusBar style="dark" />
    <SnackbarProvider><AuthProvider><AppServicesProvider>{children}</AppServicesProvider></AuthProvider></SnackbarProvider>
  </SafeAreaProvider></GestureHandlerRootView>;
}
