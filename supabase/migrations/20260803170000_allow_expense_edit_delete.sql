revoke update(status) on table public.expenses from authenticated;
grant update, delete on table public.expenses to authenticated;

drop policy if exists "owners can cancel project expenses" on public.expenses;

create policy "owners can update project expenses"
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

create policy "owners can delete project expenses"
on public.expenses for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = expenses.project_id
      and projects.owner_id = (select auth.uid())
  )
);
