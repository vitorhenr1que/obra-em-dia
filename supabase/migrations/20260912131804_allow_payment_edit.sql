revoke update(status) on table public.payments from authenticated;
grant update(amount_cents, paid_on, method, note, status) on table public.payments to authenticated;
