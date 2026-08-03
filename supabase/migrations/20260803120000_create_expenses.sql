create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  spent_on date not null,
  category text not null
    check (category in ('Material', 'Mão de obra extra', 'Frete', 'Equipamento', 'Taxas', 'Outros')),
  item_name text not null
    constraint expenses_item_name_length check (char_length(item_name) between 2 and 80),
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit text not null default 'unidade' check (char_length(unit) between 1 and 30),
  description text not null check (char_length(description) between 2 and 160),
  supplier text not null check (char_length(supplier) between 2 and 120),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'active'
    check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

create index expenses_project_spent_on_idx
on public.expenses(project_id, spent_on desc);

alter table public.expenses enable row level security;

revoke all on table public.expenses from anon, authenticated;
grant select, insert, update(status) on table public.expenses to authenticated;

create policy "owners can read project expenses"
on public.expenses for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "owners can create project expenses"
on public.expenses for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "owners can cancel project expenses"
on public.expenses for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
);
