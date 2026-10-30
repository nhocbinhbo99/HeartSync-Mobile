import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';

import type { CallRepository, ChatRepository, DiscoveryRepository, MatchRepository, PreferencesRepository, ProfileRepository, SavedProfilesRepository } from './contracts';
import { SupabaseCallRepository, SupabaseChatRepository, SupabaseDiscoveryRepository } from './supabaseFeatureRepositories';
import { SupabaseMatchRepository } from './supabaseMatchRepository';
import { SupabasePreferencesRepository, SupabaseProfileRepository, SupabaseSavedProfilesRepository } from './supabaseProfileRepositories';
import { getSupabaseClient } from './supabase';

export type AppServices = {
  profile: ProfileRepository;
  preferences: PreferencesRepository;
  saved: SavedProfilesRepository;
  discovery: DiscoveryRepository;
  matches: MatchRepository;
  chat: ChatRepository;
  calls: CallRepository;
};

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({ children }: PropsWithChildren) {
  const services = useMemo<AppServices | null>(() => {
    const client = getSupabaseClient();
    if (!client) return null;
    const profile = new SupabaseProfileRepository(client);
    return {
      profile,
      preferences: new SupabasePreferencesRepository(client),
      saved: new SupabaseSavedProfilesRepository(client, profile),
      discovery: new SupabaseDiscoveryRepository(client),
      matches: new SupabaseMatchRepository(client),
      chat: new SupabaseChatRepository(client),
      calls: new SupabaseCallRepository(client),
    };
  }, []);
  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}

export function useAppServices() {
  return useContext(AppServicesContext);
}
