import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AppServicesProvider } from '../services/AppServicesProvider';
import { SnackbarProvider } from '../shared/components/Snackbar';

export function AppProviders({ children }: PropsWithChildren) {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular: require('../../assets/fonts/Nunito-Regular.ttf'),
    Nunito_600SemiBold: require('../../assets/fonts/Nunito-SemiBold.ttf'),
    Nunito_700Bold: require('../../assets/fonts/Nunito-Bold.ttf'),
    Nunito_800ExtraBold: require('../../assets/fonts/Nunito-ExtraBold.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SnackbarProvider>
          <AuthProvider>
            <AppServicesProvider>{children}</AppServicesProvider>
          </AuthProvider>
        </SnackbarProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
