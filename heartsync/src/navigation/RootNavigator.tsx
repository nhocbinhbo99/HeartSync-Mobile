import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppIcon } from '../shared/components/AppIcon';
import { AuthScreen } from '../features/auth/AuthScreen';
import { AuthLoadingScreen, SetupRequiredScreen } from '../features/auth/AuthStateScreens';
import { UpdatePasswordScreen } from '../features/auth/UpdatePasswordScreen';
import { useAuth } from '../features/auth/AuthProvider';
import { AudioCallScreen, VideoCallScreen } from '../features/calling/CallScreens';
import { ChatScreen } from '../features/chat/ChatScreen';
import { DiscoverScreen } from '../features/discovery/DiscoverScreen';
import { MatchFoundScreen } from '../features/matching/MatchFoundScreen';
import { MatchesScreen } from '../features/matching/MatchesScreen';
import { EditProfileScreen, OtherProfileScreen, SafetyScreen } from '../features/profile/ProfileDetailScreens';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { FiltersScreen } from '../features/preferences/FiltersScreen';
import { SavedScreen } from '../features/saved/SavedScreen';
import { colors, type } from '../shared/theme/tokens';
import { navigationTheme } from '../shared/theme/navigationTheme';
import type { MainTabParamList, RootStackParamList } from './types';
import { resolveNavigationMode } from './navigationMode';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons = {
  Discover: { ios: 'safari.fill', android: 'explore', web: 'explore' },
  Saved: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  Matches: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  Profile: { ios: 'person.fill', android: 'person', web: 'person' },
} as const;

function MainTabs() {
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerTitleStyle: type.subtitle,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.surface },
    tabBarActiveTintColor: colors.primaryPressed,
    tabBarInactiveTintColor: colors.inkMuted,
    tabBarLabelStyle: type.caption,
    tabBarStyle: { minHeight: 66, paddingTop: 6, paddingBottom: 8, backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarIcon: ({ color, size }) => <AppIcon name={tabIcons[route.name]} color={color} size={size} />,
  })}>
    <Tabs.Screen name="Discover" component={DiscoverScreen} options={{ title: 'Khám phá' }} />
    <Tabs.Screen name="Saved" component={SavedScreen} options={{ title: 'Đã lưu' }} />
    <Tabs.Screen name="Matches" component={MatchesScreen} options={{ title: 'Kết nối' }} />
    <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
  </Tabs.Navigator>;
}

export function RootNavigator() {
  const { status, recoveryPending } = useAuth();
  const mode = resolveNavigationMode(status, recoveryPending);
  return <NavigationContainer theme={navigationTheme}>
    <Stack.Navigator key={mode} screenOptions={{ headerShadowVisible: false, headerTintColor: colors.ink,
      headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: type.subtitle }}>
      {mode === 'loading' ? <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} options={{ headerShown: false }} /> : null}
      {mode === 'setup' ? <Stack.Screen name="SetupRequired" component={SetupRequiredScreen} options={{ headerShown: false }} /> : null}
      {mode === 'auth' ? <>
        <Stack.Screen name="SignIn" options={{ headerShown: false }}>{(props) => <AuthScreen {...props} mode="sign-in" />}</Stack.Screen>
        <Stack.Screen name="SignUp" options={{ title: 'Tạo tài khoản' }}>{(props) => <AuthScreen {...props} mode="sign-up" />}</Stack.Screen>
        <Stack.Screen name="ForgotPassword" options={{ title: 'Quên mật khẩu' }}>{(props) => <AuthScreen {...props} mode="forgot-password" />}</Stack.Screen>
      </> : null}
      {mode === 'recovery' ? <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} options={{ headerShown: false }} /> : null}
      {mode === 'main' ? <>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Chỉnh sửa hồ sơ' }} />
        <Stack.Screen name="Filters" component={FiltersScreen} options={{ title: 'Bộ lọc' }} />
        <Stack.Screen name="OtherProfile" component={OtherProfileScreen} options={{ title: 'Hồ sơ' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Trò chuyện' }} />
        <Stack.Screen name="AudioCall" component={AudioCallScreen} options={{ title: 'Cuộc gọi thoại' }} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ title: 'Cuộc gọi video' }} />
        <Stack.Screen name="MatchFound" component={MatchFoundScreen} options={{ title: 'Kết nối mới' }} />
        <Stack.Screen name="Safety" component={SafetyScreen} options={{ title: 'An toàn' }} />
      </> : null}
    </Stack.Navigator>
  </NavigationContainer>;
}
