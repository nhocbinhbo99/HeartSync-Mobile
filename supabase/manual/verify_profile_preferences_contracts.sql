-- Read-only verification for 20261103120000_profile_preferences_contracts.sql.
-- Safe to run repeatedly against the dedicated HeartSync development project.

with expected_functions(name) as (
  values
    ('save_my_profile'),
    ('save_my_private_location'),
    ('save_my_preferences'),
    ('reorder_profile_photos'),
    ('set_primary_profile_photo'),
    ('list_saved_profiles')
),
expected_interests(slug) as (
  values
    ('books'),
    ('coffee'),
    ('hiking'),
    ('music'),
    ('photography'),
    ('cooking'),
    ('travel'),
    ('movies'),
    ('fitness'),
    ('gaming'),
    ('pets'),
    ('art'),
    ('technology'),
    ('volunteering'),
    ('nature')
)
select jsonb_build_object(
  'function_count', (
    select count(distinct p.proname)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join expected_functions expected on expected.name = p.proname
    where n.nspname = 'public'
  ),
  'authenticated_execute_grants', (
    select count(distinct privileges.routine_name)
    from information_schema.routine_privileges privileges
    join expected_functions expected on expected.name = privileges.routine_name
    where privileges.specific_schema = 'public'
      and privileges.grantee = 'authenticated'
      and privileges.privilege_type = 'EXECUTE'
  ),
  'unsafe_execute_grants', (
    select count(*)
    from information_schema.routine_privileges privileges
    join expected_functions expected on expected.name = privileges.routine_name
    where privileges.specific_schema = 'public'
      and privileges.grantee in ('PUBLIC', 'anon')
      and privileges.privilege_type = 'EXECUTE'
  ),
  'expected_interest_count', (
    select count(*)
    from public.interests interests
    join expected_interests expected on expected.slug = interests.slug
  ),
  'photo_order_constraint', (
    select jsonb_build_object(
      'definition', pg_get_constraintdef(constraint_row.oid),
      'deferrable', constraint_row.condeferrable,
      'initially_deferred', constraint_row.condeferred
    )
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'profile_photos'
      and constraint_row.conname = 'profile_photos_profile_order_unique'
  )
) as profile_preferences_contracts;
