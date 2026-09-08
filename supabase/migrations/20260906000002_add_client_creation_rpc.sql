create or replace function public.create_client(
    p_name text,
    p_email text default null,
    p_tax_id text default null,
    p_address_json jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
    client_id uuid;
    current_org_id uuid := public.current_user_org_id();
begin
    if current_org_id is null then
        raise exception 'authenticated organization is required';
    end if;

    insert into public.clients (org_id, name, email, tax_id, address_json)
    values (current_org_id, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_tax_id), ''), coalesce(p_address_json, '{}'::jsonb))
    returning id into client_id;

    return client_id;
end;
$$;

grant execute on function public.create_client(text, text, text, jsonb) to authenticated;
