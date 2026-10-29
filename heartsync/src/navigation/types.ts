import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Discover: undefined;
  Saved: undefined;
  Matches: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  EditProfile: undefined;
  Filters: undefined;
  OtherProfile: { profileId?: string } | undefined;
  Chat: { matchId?: string } | undefined;
  AudioCall: { matchId?: string } | undefined;
  VideoCall: { matchId?: string } | undefined;
  MatchFound: { matchId?: string } | undefined;
  Safety: { profileId?: string } | undefined;
};

declare global {
  namespace ReactNavigation {
    // React Navigation uses declaration merging to type global navigation helpers.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
