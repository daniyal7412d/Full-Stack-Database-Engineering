alter table public.invoices
    rename column discount to discount_rate;

alter table public.invoices
    drop constraint if exists invoices_discount_check;

alter table public.invoices
    add constraint invoices_discount_rate_check check (discount_rate >= 0 and discount_rate <= 100);

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
        total_amount = round(
            coalesce((
                select sum(ii.total)
                from public.invoice_items ii
                where ii.invoice_id = i.id
            ), 0) * (1 + i.tax_rate / 100) * (1 - i.discount_rate / 100),
            2
        )
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
security definer
set search_path = public
as $$
declare
    invoice_id uuid;
    current_org_id uuid := public.current_user_org_id();
    selected_client_id uuid := (p_invoice ->> 'client_id')::uuid;
    item jsonb;
begin
    if current_org_id is null or public.current_user_role() is null or public.current_user_role() = 'client_viewer' then
        raise exception 'authorized organization member is required';
    end if;

    if not exists (select 1 from public.clients where id = selected_client_id and org_id = current_org_id) then
        raise exception 'client does not belong to your organization';
    end if;

    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'at least one invoice item is required';
    end if;

    insert into public.invoices (
        org_id, client_id, invoice_number, status, currency,
        subtotal, tax_rate, discount_rate, total_amount, due_date
    ) values (
        current_org_id,
        selected_client_id,
        trim(p_invoice ->> 'invoice_number'),
        coalesce((p_invoice ->> 'status')::public.invoice_status, 'draft'),
        upper(coalesce(p_invoice ->> 'currency', 'USD')),
        0,
        coalesce((p_invoice ->> 'tax_rate')::numeric, 0),
        coalesce((p_invoice ->> 'discount_rate')::numeric, 0),
        0,
        nullif(p_invoice ->> 'due_date', '')::date
    ) returning id into invoice_id;

    for item in select value from jsonb_array_elements(p_items)
    loop
        insert into public.invoice_items (org_id, invoice_id, description, quantity, unit_price)
        values (current_org_id, invoice_id, trim(item ->> 'description'), (item ->> 'quantity')::numeric, (item ->> 'unit_price')::numeric);
    end loop;

    update public.invoices i
    set total_amount = round(i.subtotal * (1 + i.tax_rate / 100) * (1 - i.discount_rate / 100), 2)
    where i.id = invoice_id;

    return invoice_id;
end;
$$;
