# Service boundary

Q02 provides the configured-or-null Supabase singleton and auth provider. Q03 supplies prepared SQL only. Starting in Q04, screens must consume typed repository/gateway boundaries instead of calling Supabase tables, RPCs, Realtime, or media services directly.

- Interfaces: `contracts.ts`
- Stable transport-to-UX error mapping: `errors.ts`
- Minimal atomic swipe adapter: `supabaseMatchRepository.ts`
- Preview fixtures: `demo/demoData.ts` (`DEMO_ONLY`, never a production fallback)

See the repository-root `ARCHITECTURE.md` for ownership, RPC contracts, state rules, and current backend blockers.
