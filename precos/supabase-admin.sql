begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.produtos enable row level security;

-- Replace existing policies so no older broad write policy bypasses admin-only access.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'produtos'
  loop
    execute format('drop policy %I on public.produtos', existing_policy.policyname);
  end loop;
end;
$$;

revoke insert, update, delete on public.produtos from anon, authenticated;
grant select on public.produtos to anon, authenticated;
grant insert, update, delete on public.produtos to authenticated;

create policy "Public can read products"
  on public.produtos
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert products"
  on public.produtos
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update products"
  on public.produtos
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete products"
  on public.produtos
  for delete
  to authenticated
  using ((select public.is_admin()));

commit;
