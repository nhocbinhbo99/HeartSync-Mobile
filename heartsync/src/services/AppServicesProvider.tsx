import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import type {
  CallRepository,
  ChatRepository,
  DiscoveryRepository,
  AiAssistantRepository,
  MatchRepository,
  PreferencesRepository,
  ProfileRepository,
  SavedProfilesRepository,
} from "./contracts";
import { SupabaseAiAssistantRepository } from "./aiAssistantRepository";
import {
  SupabaseCallRepository,
  SupabaseChatRepository,
  SupabaseDiscoveryRepository,
} from "./supabaseFeatureRepositories";
import { SupabaseMatchRepository } from "./supabaseMatchRepository";
import {
  SupabasePreferencesRepository,
  SupabaseProfileRepository,
  SupabaseSavedProfilesRepository,
} from "./supabaseProfileRepositories";
import { getSupabaseClient } from "./supabase";

export type AppServices = {
  ai: AiAssistantRepository;
  profile: ProfileRepository;
  preferences: PreferencesRepository;
  saved: SavedProfilesRepository;
  discovery: DiscoveryRepository;
  matches: MatchRepository;
  chat: ChatRepository;
  calls: CallRepository;
  createCallGateway(): import("./contracts").CallGateway;
};

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({ children }: PropsWithChildren) {
  const services = useMemo<AppServices | null>(() => {
    const client = getSupabaseClient();
    if (!client) return null;
    const profile = new SupabaseProfileRepository(client);
    return {
      ai: new SupabaseAiAssistantRepository(client),
      profile,
      preferences: new SupabasePreferencesRepository(client),
      saved: new SupabaseSavedProfilesRepository(client),
      discovery: new SupabaseDiscoveryRepository(client),
      matches: new SupabaseMatchRepository(client),
      chat: new SupabaseChatRepository(client),
      calls: new SupabaseCallRepository(client),
      createCallGateway: () => {
        const { ensureLiveKitGlobals } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("./livekit/bootstrap") as typeof import("./livekit/bootstrap");
        const { LiveKitCallGateway } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("./livekit/LiveKitCallGateway") as typeof import("./livekit/LiveKitCallGateway");
        ensureLiveKitGlobals();
        return new LiveKitCallGateway(client);
      },
    };
  }, []);
  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices() {
  return useContext(AppServicesContext);
}
