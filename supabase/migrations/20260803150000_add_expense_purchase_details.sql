alter table public.expenses
add column if not exists quantity numeric(12, 3) not null default 1
  check (quantity > 0);

alter table public.expenses
add column if not exists unit text not null default 'unidade'
  check (char_length(unit) between 1 and 30);

update public.expenses
set supplier = 'Não informado'
where supplier is null or btrim(supplier) = '';

alter table public.expenses
alter column supplier set not null;

alter table public.expenses
drop constraint if exists expenses_supplier_check;

alter table public.expenses
add constraint expenses_supplier_check
check (char_length(supplier) between 2 and 120);
