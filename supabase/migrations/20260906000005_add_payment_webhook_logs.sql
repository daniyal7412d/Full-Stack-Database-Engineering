create table public.payment_logs (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    status public.invoice_status not null,
    transaction_reference text not null unique,
    payload jsonb not null default '{}'::jsonb,
    received_at timestamptz not null default now()
);

create index payment_logs_invoice_id_idx on public.payment_logs (invoice_id);
create index payment_logs_received_at_idx on public.payment_logs (received_at desc);

alter table public.payment_logs enable row level security;

create policy payment_logs_select_same_org
on public.payment_logs for select to authenticated
using (
    exists (
        select 1
        from public.invoices i
        where i.id = payment_logs.invoice_id
          and i.org_id = public.current_user_org_id()
    )
);

create or replace function public.process_payment_webhook(
    p_invoice_id uuid,
    p_status public.invoice_status,
    p_transaction_reference text,
    p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    updated_invoice_id uuid;
    inserted_log_id uuid;
begin
    if p_status <> 'paid' then
        raise exception 'unsupported payment status';
    end if;

    update public.invoices
    set status = 'paid'
    where id = p_invoice_id
    returning id into updated_invoice_id;

    if updated_invoice_id is null then
        raise exception 'invoice not found';
    end if;

    insert into public.payment_logs (
        invoice_id,
        status,
        transaction_reference,
        payload
    ) values (
        p_invoice_id,
        p_status,
        p_transaction_reference,
        coalesce(p_payload, '{}'::jsonb)
    )
    on conflict (transaction_reference) do nothing
    returning id into inserted_log_id;

    return jsonb_build_object(
        'processed', inserted_log_id is not null,
        'duplicate', inserted_log_id is null,
        'invoice_id', p_invoice_id,
        'transaction_reference', p_transaction_reference
    );
end;
$$;

revoke all on function public.process_payment_webhook(uuid, public.invoice_status, text, jsonb) from public;
grant execute on function public.process_payment_webhook(uuid, public.invoice_status, text, jsonb) to service_role;
