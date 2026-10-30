import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AppServicesProvider } from '../services/AppServicesProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return <SafeAreaProvider><StatusBar style="dark" /><AuthProvider><AppServicesProvider>{children}</AppServicesProvider></AuthProvider></SafeAreaProvider>;
}
