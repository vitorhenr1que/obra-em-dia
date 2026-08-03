create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  contractor_name text not null check (char_length(contractor_name) between 2 and 100),
  worker_name text not null check (char_length(worker_name) between 2 and 100),
  total_amount_cents bigint not null check (total_amount_cents > 0),
  started_on date not null,
  address text,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  public_token uuid not null default gen_random_uuid() unique,
  public_link_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  receipt_code text not null default (
    'REC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ) unique,
  amount_cents bigint not null check (amount_cents > 0),
  paid_on date not null,
  method text not null check (method in ('PIX', 'Dinheiro', 'Transferência', 'Outro')),
  note text,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects(owner_id);
create index payments_project_paid_on_idx on public.payments(project_id, paid_on desc);

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create function app_private.request_public_token()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select (
    coalesce(
      nullif(current_setting('request.headers', true), ''),
      '{}'
    )::jsonb ->> 'x-public-token'
  );
$$;

revoke all on function app_private.request_public_token() from public;
grant execute on function app_private.request_public_token() to anon, authenticated;

alter table public.projects enable row level security;
alter table public.payments enable row level security;

revoke all on table public.projects from anon, authenticated;
revoke all on table public.payments from anon, authenticated;

grant select, insert, update on table public.projects to authenticated;
grant select, insert, update(status) on table public.payments to authenticated;
grant select (
  id,
  title,
  contractor_name,
  worker_name,
  total_amount_cents,
  started_on,
  address,
  status,
  public_token,
  public_link_active,
  created_at
) on table public.projects to anon;
grant select (
  id,
  project_id,
  receipt_code,
  amount_cents,
  paid_on,
  method,
  note,
  status,
  created_at
) on table public.payments to anon;

create policy "owners can read their projects"
on public.projects for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "owners can create projects"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "owners can update their projects"
on public.projects for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "owners can read project payments"
on public.payments for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = payments.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "owners can create project payments"
on public.payments for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = payments.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "owners can cancel project payments"
on public.payments for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = payments.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = payments.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "public links can read their project"
on public.projects for select
to anon
using (
  public_link_active = true
  and public_token::text = (select app_private.request_public_token())
);

create policy "public links can read project payments"
on public.payments for select
to anon
using (
  exists (
    select 1
    from public.projects
    where projects.id = payments.project_id
      and projects.public_link_active = true
      and projects.public_token::text = (select app_private.request_public_token())
  )
);
