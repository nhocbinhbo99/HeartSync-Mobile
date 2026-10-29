import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function AppProviders({ children }: PropsWithChildren) {
  return <SafeAreaProvider><StatusBar style="dark" />{children}</SafeAreaProvider>;
}
