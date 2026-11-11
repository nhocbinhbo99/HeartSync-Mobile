import { IncomingCallOverlay } from "../features/calling/IncomingCallOverlay";
import {
  createNavigationContainerRef,
  NavigationContainer,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";

import { AppIcon } from "../shared/components/AppIcon";
import { AuthScreen } from "../features/auth/AuthScreen";
import {
  AuthLoadingScreen,
  SetupRequiredScreen,
} from "../features/auth/AuthStateScreens";
import { UpdatePasswordScreen } from "../features/auth/UpdatePasswordScreen";
import { OnboardingScreen, WelcomeScreen } from "../features/auth/WelcomeScreens";
import { useAuth } from "../features/auth/AuthProvider";
import {
  AudioCallScreen,
  VideoCallScreen,
} from "../features/calling/CallScreens";
import { ChatScreen } from "../features/chat/ChatScreen";
import { DiscoverScreen } from "../features/discovery/DiscoverScreen";
import { MatchFoundScreen } from "../features/matching/MatchFoundScreen";
import { MatchesScreen } from "../features/matching/MatchesScreen";
import {
  EditProfileScreen,
  OtherProfileScreen,
  ReportScreen,
  SafetyScreen,
} from "../features/profile/ProfileDetailScreens";
import { InterestsScreen, SettingsScreen } from "../features/profile/ProfileExtraScreens";
import { ProfileScreen } from "../features/profile/ProfileScreen";
import { ProfileSetupScreen } from "../features/profile/ProfileSetupScreen";
import { FiltersScreen } from "../features/preferences/FiltersScreen";
import { SavedScreen } from "../features/saved/SavedScreen";
import { colors, type } from "../shared/theme/tokens";
import { navigationTheme } from "../shared/theme/navigationTheme";
import type { MainTabParamList, RootStackParamList } from "./types";
import { resolveNavigationMode } from "./navigationMode";

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons = {
  Discover: { ios: "safari.fill", android: "explore", web: "explore" },
  Saved: { ios: "bookmark.fill", android: "bookmark", web: "bookmark" },
  Matches: { ios: "heart.fill", android: "favorite", web: "favorite" },
  Profile: { ios: "person.fill", android: "person", web: "person" },
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
        tabBarLabelStyle: type.caption,
        tabBarStyle: {
          minHeight: 66,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size, focused }) => (
          <View style={{ width: 54, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: focused ? colors.primarySoft : "transparent" }}>
            <AppIcon name={tabIcons[route.name]} color={color} size={focused ? 23 : size} />
          </View>
        ),
      })}
    >
      <Tabs.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: "Khám phá", headerShown: false }}
      />
      <Tabs.Screen
        name="Saved"
        component={SavedScreen}
        options={{ title: "Đã lưu", headerShown: false }}
      />
      <Tabs.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ title: "Kết nối", headerShown: false }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Trang cá nhân", headerShown: false }}
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
        }}
      >
        {mode === "loading" ? (
          <Stack.Screen
            name="AuthLoading"
            component={AuthLoadingScreen}
            options={{ headerShown: false }}
          />
        ) : null}
        {mode === "setup" ? (
          <Stack.Screen
            name="SetupRequired"
            component={SetupRequiredScreen}
            options={{ headerShown: false }}
          />
        ) : null}
        {mode === "auth" ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignIn" options={{ headerShown: false }}>
              {(props) => <AuthScreen {...props} mode="sign-in" />}
            </Stack.Screen>
            <Stack.Screen name="SignUp" options={{ headerShown: false }}>
              {(props) => <AuthScreen {...props} mode="sign-up" />}
            </Stack.Screen>
            <Stack.Screen
              name="ForgotPassword"
              options={{ headerShown: false }}
            >
              {(props) => <AuthScreen {...props} mode="forgot-password" />}
            </Stack.Screen>
          </>
        ) : null}
        {mode === "recovery" ? (
          <Stack.Screen
            name="UpdatePassword"
            component={UpdatePasswordScreen}
            options={{ headerShown: false }}
          />
        ) : null}
        {mode === "profile-setup" ? (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{
              title: "Thiết lập hồ sơ",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        ) : null}
        {mode === "main" ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Interests"
              component={InterestsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Filters"
              component={FiltersScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OtherProfile"
              component={OtherProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AudioCall"
              component={AudioCallScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="VideoCall"
              component={VideoCallScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MatchFound"
              component={MatchFoundScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Safety"
              component={SafetyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Report"
              component={ReportScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : null}
      </Stack.Navigator>
      {mode === "main" ? (
        <IncomingCallOverlay
          onOpen={(call) => {
            if (navigationRef.isReady())
              navigationRef.navigate(call.type === "video" ? "VideoCall" : "AudioCall", {
                matchId: call.matchId,
                callId: call.id,
                incoming: true,
              });
          }}
        />
      ) : null}
    </NavigationContainer>
  );
}
