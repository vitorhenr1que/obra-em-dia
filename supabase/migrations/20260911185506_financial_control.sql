create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  brand text not null check (brand in ('Visa', 'Mastercard', 'Elo', 'Amex', 'Outro')),
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  credit_limit_cents bigint not null check (credit_limit_cents > 0),
  closing_day smallint not null check (closing_day between 1 and 28),
  due_day smallint not null check (due_day between 1 and 28),
  color text not null default 'violet' check (color in ('violet', 'navy', 'green', 'graphite')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.expenses
add column card_id uuid references public.credit_cards(id) on delete set null,
add column card_installments_count smallint not null default 1 check (card_installments_count between 1 and 48),
add column card_installments_paid smallint not null default 0,
add column card_paid_on date,
add constraint expenses_card_installments_progress_check
  check (card_installments_paid between 0 and card_installments_count);

create index expenses_card_id_idx on public.expenses(card_id)
where card_id is not null;

create table public.card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  description text not null check (char_length(description) between 2 and 120),
  category text not null check (char_length(category) between 2 and 50),
  total_amount_cents bigint not null check (total_amount_cents > 0),
  installments_count smallint not null check (installments_count between 1 and 48),
  installments_paid smallint not null default 0 check (installments_paid >= 0 and installments_paid <= installments_count),
  first_installment_on date not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references public.credit_cards(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  category text not null check (category in ('Assinatura', 'Investimento', 'Essencial', 'Outro')),
  amount_cents bigint not null check (amount_cents > 0),
  billing_day smallint not null check (billing_day between 1 and 28),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create index credit_cards_user_id_idx on public.credit_cards(user_id);
create index card_purchases_card_id_idx on public.card_purchases(card_id);
create index card_purchases_user_id_idx on public.card_purchases(user_id);
create index recurring_expenses_user_id_idx on public.recurring_expenses(user_id);

alter table public.credit_cards enable row level security;
alter table public.card_purchases enable row level security;
alter table public.recurring_expenses enable row level security;

revoke all on table public.credit_cards, public.card_purchases, public.recurring_expenses from anon, authenticated;
grant select, insert, update, delete on table public.credit_cards, public.card_purchases, public.recurring_expenses to authenticated;

create policy "users manage their own cards"
on public.credit_cards for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users manage their own purchases"
on public.card_purchases for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.credit_cards
    where credit_cards.id = card_purchases.card_id
      and credit_cards.user_id = (select auth.uid())
  )
);

create policy "users manage their own recurring expenses"
on public.recurring_expenses for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    card_id is null
    or exists (
      select 1 from public.credit_cards
      where credit_cards.id = recurring_expenses.card_id
        and credit_cards.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "owners can create project expenses" on public.expenses;
create policy "owners can create project expenses"
on public.expenses for insert
to authenticated
with check (
  exists (
    select 1 from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
  and (
    card_id is null
    or exists (
      select 1 from public.credit_cards
      where credit_cards.id = expenses.card_id
        and credit_cards.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "owners can update project expenses" on public.expenses;
create policy "owners can update project expenses"
on public.expenses for update
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
  and (
    card_id is null
    or exists (
      select 1 from public.credit_cards
      where credit_cards.id = expenses.card_id
        and credit_cards.user_id = (select auth.uid())
    )
  )
);
