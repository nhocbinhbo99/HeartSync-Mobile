# Service boundary

Q02 provides the configured-or-null Supabase singleton and auth provider. Q03 supplies prepared SQL only. Starting in Q04, screens must consume typed repository/gateway boundaries instead of calling Supabase tables, RPCs, Realtime, or media services directly.
