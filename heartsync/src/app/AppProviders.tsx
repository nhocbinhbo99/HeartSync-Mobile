import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../features/auth/AuthProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return <SafeAreaProvider><StatusBar style="dark" /><AuthProvider>{children}</AuthProvider></SafeAreaProvider>;
}
