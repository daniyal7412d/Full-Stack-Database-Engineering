alter table public.invoices
    add column discount numeric(12, 2) not null default 0
    check (discount >= 0);

create or replace function public.recalculate_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.invoices i
    set subtotal = coalesce((
            select sum(ii.total)
            from public.invoice_items ii
            where ii.invoice_id = i.id
        ), 0),
        total_amount = greatest(round(
            coalesce((
                select sum(ii.total)
                from public.invoice_items ii
                where ii.invoice_id = i.id
            ), 0) * (1 + i.tax_rate / 100) - i.discount,
            2
        ), 0)
    where i.id in (old.invoice_id, new.invoice_id);
    return coalesce(new, old);
end;
$$;

create or replace function public.create_invoice_with_items(
    p_invoice jsonb,
    p_items jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
    invoice_id uuid;
    current_org_id uuid := public.current_user_org_id();
    item jsonb;
begin
    if current_org_id is null then
        raise exception 'authenticated organization is required';
    end if;

    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'at least one invoice item is required';
    end if;

    insert into public.invoices (
        org_id,
        client_id,
        invoice_number,
        status,
        currency,
        subtotal,
        tax_rate,
        discount,
        total_amount,
        due_date
    ) values (
        current_org_id,
        (p_invoice ->> 'client_id')::uuid,
        trim(p_invoice ->> 'invoice_number'),
        coalesce((p_invoice ->> 'status')::public.invoice_status, 'draft'),
        upper(coalesce(p_invoice ->> 'currency', 'USD')),
        0,
        coalesce((p_invoice ->> 'tax_rate')::numeric, 0),
        coalesce((p_invoice ->> 'discount')::numeric, 0),
        0,
        nullif(p_invoice ->> 'due_date', '')::date
    ) returning id into invoice_id;

    for item in select value from jsonb_array_elements(p_items)
    loop
        insert into public.invoice_items (
            org_id,
            invoice_id,
            description,
            quantity,
            unit_price
        ) values (
            current_org_id,
            invoice_id,
            trim(item ->> 'description'),
            (item ->> 'quantity')::numeric,
            (item ->> 'unit_price')::numeric
        );
    end loop;

    return invoice_id;
end;
$$;

grant execute on function public.create_invoice_with_items(jsonb, jsonb) to authenticated;
