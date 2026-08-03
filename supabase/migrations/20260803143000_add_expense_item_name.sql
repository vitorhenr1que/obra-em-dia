alter table public.expenses
add column if not exists item_name text;

update public.expenses
set item_name = case
  when category = 'Material' then 'Material não especificado'
  else category
end
where item_name is null or btrim(item_name) = '';

alter table public.expenses
alter column item_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expenses_item_name_length'
      and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
    add constraint expenses_item_name_length
    check (char_length(item_name) between 2 and 80);
  end if;
end
$$;
