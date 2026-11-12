import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IncomingCallOverlay } from '../features/calling/IncomingCallOverlay';
import { RealtimeMatchListener } from '../features/matching/RealtimeMatchListener';
import { AppIcon, type AppIconName } from '../shared/components/AppIcon';
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

const tabIcons: Record<
  keyof MainTabParamList,
  { active: AppIconName; inactive: AppIconName }
> = {
  Discover: {
    active: 'compassFilled',
    inactive: 'compass',
  },
  Saved: {
    active: 'heart',
    inactive: 'heartOutline',
  },
  Matches: {
    active: 'chatBubbleFilled',
    inactive: 'chatBubble',
  },
  Profile: {
    active: 'personFilled',
    inactive: 'person',
  },
};

function AnimatedTabIcon({
  routeName,
  color,
  focused,
}: {
  routeName: keyof MainTabParamList;
  color: string;
  focused: boolean;
}) {
  const scale = useSharedValue(focused ? 1.1 : 1);
  const translateY = useSharedValue(focused ? -2 : 0);
  const indicatorWidth = useSharedValue(focused ? 18 : 0);
  const indicatorOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 13, stiffness: 190 });
    translateY.value = withSpring(focused ? -2 : 0, { damping: 14, stiffness: 190 });
    indicatorWidth.value = withSpring(focused ? 18 : 0, { damping: 15, stiffness: 200 });
    indicatorOpacity.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, indicatorOpacity, indicatorWidth, scale, translateY]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  const icons = tabIcons[routeName];

  return (
    <View style={styles.tabIconContainer}>
      <Animated.View style={[styles.iconBox, iconWrapStyle]}>
        <AppIcon name={focused ? icons.active : icons.inactive} color={color} size={23} />
      </Animated.View>
      <Animated.View style={[styles.activeBar, barStyle]} />
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 12);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerTitleStyle: type.subtitle,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primaryPressed,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarButton: ({ style, children, ...rest }) => (
          <Pressable
            {...rest}
            android_ripple={{ color: 'transparent' }}
            style={(state) => [
              style,
              styles.tabPressable,
              state.pressed && styles.tabPressablePressed,
            ]}
          >
            {children}
          </Pressable>
        ),
        tabBarStyle: {
          height: 62 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F2DCE5',
          borderTopWidth: 1,
          shadowColor: '#24111A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarIcon: ({ color, focused }) => (
          <AnimatedTabIcon routeName={route.name} color={color} focused={focused} />
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
        <>
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
          <RealtimeMatchListener
            canPresentNow={() => {
              if (!navigationRef.isReady()) return false;
              const currentName = navigationRef.getCurrentRoute()?.name;
              return (
                currentName !== 'AudioCall' &&
                currentName !== 'VideoCall' &&
                currentName !== 'MatchFound'
              );
            }}
            onMatchFound={(matchId) => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('MatchFound', { matchId });
              }
            }}
          />
        </>
      ) : null}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 30,
  },
  iconBox: {
    width: 36,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBar: {
    height: 3,
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabPressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabPressablePressed: {
    opacity: 0.78,
  },
});
