import { IncomingCallOverlay } from '../features/calling/IncomingCallOverlay';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { AppIcon } from '../shared/components/AppIcon';
import { AuthScreen } from '../features/auth/AuthScreen';
import { AuthLoadingScreen, SetupRequiredScreen } from '../features/auth/AuthStateScreens';
import { UpdatePasswordScreen } from '../features/auth/UpdatePasswordScreen';
import { OnboardingScreen, WelcomeScreen } from '../features/auth/WelcomeScreens';
import { useAuth } from '../features/auth/AuthProvider';
import { AudioCallScreen, VideoCallScreen } from '../features/calling/CallScreens';
import { ChatScreen } from '../features/chat/ChatScreen';
import { DiscoverScreen } from '../features/discovery/DiscoverScreen';
import { MatchFoundScreen } from '../features/matching/MatchFoundScreen';
import { MatchesScreen } from '../features/matching/MatchesScreen';
import {
  EditProfileScreen,
  OtherProfileScreen,
  ReportScreen,
  SafetyScreen,
} from '../features/profile/ProfileDetailScreens';
import { InterestsScreen, SettingsScreen } from '../features/profile/ProfileExtraScreens';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ProfileSetupScreen } from '../features/profile/ProfileSetupScreen';
import { FiltersScreen } from '../features/preferences/FiltersScreen';
import { SavedScreen } from '../features/saved/SavedScreen';
import { colors, fonts, type } from '../shared/theme/tokens';
import { navigationTheme } from '../shared/theme/navigationTheme';
import type { MainTabParamList, RootStackParamList } from './types';
import { resolveNavigationMode } from './navigationMode';

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons = {
  Discover: {
    active: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
    inactive: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  },
  Saved: {
    active: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
    inactive: { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' },
  },
  Matches: {
    active: { ios: 'bubble.left.fill', android: 'chat_bubble', web: 'chat_bubble' },
    inactive: { ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' },
  },
  Profile: {
    active: { ios: 'person.fill', android: 'person', web: 'person' },
    inactive: { ios: 'person', android: 'person_outline', web: 'person_outline' },
  },
} as const;

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerTitleStyle: type.subtitle,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primaryPressed,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, marginTop: 2 },
        tabBarStyle: {
          minHeight: 68,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F7E1EA',
          borderTopWidth: 1,
          shadowColor: '#D67094',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarIcon: ({ color, focused }) => (
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <AppIcon
              name={focused ? tabIcons[route.name].active : tabIcons[route.name].inactive}
              color={color}
              size={23}
            />
            <View
              style={{
                width: focused ? 18 : 0,
                height: 3,
                borderRadius: 99,
                backgroundColor: focused ? colors.primary : 'transparent',
              }}
            />
          </View>
        ),
      })}
    >
      <Tabs.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: 'Khám phá', headerShown: false }}
      />
      <Tabs.Screen
        name="Saved"
        component={SavedScreen}
        options={{ title: 'Đã lưu', headerShown: false }}
      />
      <Tabs.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ title: 'Tin nhắn', headerShown: false }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Hồ sơ', headerShown: false }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { status, recoveryPending } = useAuth();
  const mode = resolveNavigationMode(status, recoveryPending);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        key={mode}
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: type.subtitle,
          animation: 'slide_from_right',
        }}
      >
        {mode === 'loading' ? (
          <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} options={{ headerShown: false }} />
        ) : null}
        {mode === 'setup' ? (
          <Stack.Screen name="SetupRequired" component={SetupRequiredScreen} options={{ headerShown: false }} />
        ) : null}
        {mode === 'auth' ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignIn" options={{ headerShown: false }}>
              {(props) => <AuthScreen {...props} mode="sign-in" />}
            </Stack.Screen>
            <Stack.Screen name="SignUp" options={{ headerShown: false }}>
              {(props) => <AuthScreen {...props} mode="sign-up" />}
            </Stack.Screen>
            <Stack.Screen name="ForgotPassword" options={{ headerShown: false }}>
              {(props) => <AuthScreen {...props} mode="forgot-password" />}
            </Stack.Screen>
          </>
        ) : null}
        {mode === 'recovery' ? (
          <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} options={{ headerShown: false }} />
        ) : null}
        {mode === 'profile-setup' ? (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        ) : null}
        {mode === 'main' ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Interests" component={InterestsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Filters" component={FiltersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OtherProfile" component={OtherProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AudioCall" component={AudioCallScreen} options={{ headerShown: false }} />
            <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MatchFound" component={MatchFoundScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Safety" component={SafetyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Report" component={ReportScreen} options={{ headerShown: false }} />
          </>
        ) : null}
      </Stack.Navigator>
      {mode === 'main' ? (
        <IncomingCallOverlay
          onOpen={(call) => {
            if (navigationRef.isReady()) {
              navigationRef.navigate(call.type === 'video' ? 'VideoCall' : 'AudioCall', {
                matchId: call.matchId,
                callId: call.id,
                incoming: true,
              });
            }
          }}
        />
      ) : null}
    </NavigationContainer>
  );
}
