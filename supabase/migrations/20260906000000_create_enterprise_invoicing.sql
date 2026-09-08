-- Enterprise invoicing platform for Supabase/PostgreSQL
-- Requires Supabase's auth schema and the pgcrypto extension.

create extension if not exists pgcrypto;

create type public.profile_role as enum ('admin', 'member', 'client_viewer');
create type public.invoice_status as enum ('draft', 'pending', 'paid', 'overdue');

create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) > 0),
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    org_id uuid not null references public.organizations(id) on delete cascade,
    role public.profile_role not null default 'member',
    full_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (org_id, id)
);

create table public.clients (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    name text not null check (length(trim(name)) > 0),
    email text,
    tax_id text,
    address_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (org_id, id)
);

create table public.invoices (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    client_id uuid not null,
    invoice_number text not null,
    status public.invoice_status not null default 'draft',
    currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
    subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
    tax_rate numeric(6, 3) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
    total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
    due_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (org_id, id),
    unique (org_id, invoice_number),
    foreign key (org_id, client_id)
        references public.clients (org_id, id)
        on delete restrict
);

create table public.invoice_items (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null,
    invoice_id uuid not null,
    description text not null check (length(trim(description)) > 0),
    quantity numeric(12, 3) not null check (quantity > 0),
    unit_price numeric(12, 2) not null check (unit_price >= 0),
    total numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (org_id, id),
    foreign key (org_id, invoice_id)
        references public.invoices (org_id, id)
        on delete cascade
);

-- A separate assignment table supports one viewer having access to multiple clients.
create table public.profile_client_access (
    org_id uuid not null references public.organizations(id) on delete cascade,
    profile_id uuid not null,
    client_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (profile_id, client_id),
    foreign key (org_id, profile_id)
        references public.profiles (org_id, id)
        on delete cascade,
    foreign key (org_id, client_id)
        references public.clients (org_id, id)
        on delete cascade
);

create index profiles_org_id_idx on public.profiles (org_id);
create index clients_org_id_idx on public.clients (org_id);
create index invoices_org_id_idx on public.invoices (org_id);
create index invoices_client_id_idx on public.invoices (client_id);
create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index profile_client_access_client_id_idx on public.profile_client_access (client_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger invoice_items_set_updated_at
before update on public.invoice_items
for each row execute function public.set_updated_at();

-- These helpers bypass RLS only for their narrowly defined membership checks.
create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select p.org_id
    from public.profiles p
    where p.id = (select auth.uid())
$$;

create or replace function public.current_user_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
    select p.role
    from public.profiles p
    where p.id = (select auth.uid())
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.org_id = target_org_id
          and p.role = 'admin'
    )
$$;

create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profile_client_access a
        join public.profiles p
          on p.id = a.profile_id
         and p.org_id = a.org_id
        where p.id = (select auth.uid())
          and a.client_id = target_client_id
          and a.org_id = public.current_user_org_id()
    )
$$;

create or replace function public.can_access_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.invoices i
        where i.id = target_invoice_id
          and i.org_id = public.current_user_org_id()
          and (
              public.current_user_role() <> 'client_viewer'
              or public.can_access_client(i.client_id)
          )
    )
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.profile_client_access enable row level security;

-- Organizations: the creator can bootstrap an organization; admins manage it later.
create policy organizations_select_own
on public.organizations for select to authenticated
using (id = public.current_user_org_id() or created_by = (select auth.uid()));

create policy organizations_insert_creator
on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()));

create policy organizations_update_admin
on public.organizations for update to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

create policy organizations_delete_admin
on public.organizations for delete to authenticated
using (public.is_org_admin(id));

-- Profiles: members can read their own organization; only admins manage membership and roles.
create policy profiles_select_same_org
on public.profiles for select to authenticated
using (org_id = public.current_user_org_id());

create policy profiles_insert_self
on public.profiles for insert to authenticated
with check (
    id = (select auth.uid())
    and (
        org_id = public.current_user_org_id()
        or exists (
            select 1 from public.organizations o
            where o.id = org_id and o.created_by = (select auth.uid())
        )
    )
);

create policy profiles_update_admin
on public.profiles for update to authenticated
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));

create policy profiles_update_self_name
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()) and org_id = public.current_user_org_id());

create policy profiles_delete_admin
on public.profiles for delete to authenticated
using (public.is_org_admin(org_id) and id <> (select auth.uid()));

-- Clients: viewers can see only their assigned client records and cannot modify clients.
create policy clients_select_org_or_assigned
on public.clients for select to authenticated
using (
    org_id = public.current_user_org_id()
    and (
        public.current_user_role() <> 'client_viewer'
        or public.can_access_client(id)
    )
);

create policy clients_insert_non_viewer
on public.clients for insert to authenticated
with check (
    org_id = public.current_user_org_id()
    and public.current_user_role() <> 'client_viewer'
);

create policy clients_update_non_viewer
on public.clients for update to authenticated
using (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer')
with check (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer');

create policy clients_delete_non_viewer
on public.clients for delete to authenticated
using (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer');

-- Client viewers can select only invoices for explicitly assigned clients.
create policy invoices_select_org_or_assigned
on public.invoices for select to authenticated
using (
    org_id = public.current_user_org_id()
    and public.can_access_invoice(id)
);

create policy invoices_insert_non_viewer
on public.invoices for insert to authenticated
with check (
    org_id = public.current_user_org_id()
    and public.current_user_role() <> 'client_viewer'
);

create policy invoices_update_non_viewer
on public.invoices for update to authenticated
using (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer')
with check (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer');

create policy invoices_delete_non_viewer
on public.invoices for delete to authenticated
using (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer');

create policy invoice_items_select_visible_invoice
on public.invoice_items for select to authenticated
using (org_id = public.current_user_org_id() and public.can_access_invoice(invoice_id));

create policy invoice_items_insert_non_viewer
on public.invoice_items for insert to authenticated
with check (
    org_id = public.current_user_org_id()
    and public.current_user_role() <> 'client_viewer'
    and public.can_access_invoice(invoice_id)
);

create policy invoice_items_update_non_viewer
on public.invoice_items for update to authenticated
using (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer')
with check (
    org_id = public.current_user_org_id()
    and public.current_user_role() <> 'client_viewer'
    and public.can_access_invoice(invoice_id)
);

create policy invoice_items_delete_non_viewer
on public.invoice_items for delete to authenticated
using (org_id = public.current_user_org_id() and public.current_user_role() <> 'client_viewer');

-- Only admins assign viewers to clients. Users can inspect assignments in their org.
create policy profile_client_access_select_same_org
on public.profile_client_access for select to authenticated
using (org_id = public.current_user_org_id());

create policy profile_client_access_insert_admin
on public.profile_client_access for insert to authenticated
with check (public.is_org_admin(org_id));

create policy profile_client_access_update_admin
on public.profile_client_access for update to authenticated
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));

create policy profile_client_access_delete_admin
on public.profile_client_access for delete to authenticated
using (public.is_org_admin(org_id));

-- Prevent clients from being assigned to non-viewers or to another organization.
create or replace function public.validate_client_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if not exists (
        select 1
        from public.profiles p
        where p.id = new.profile_id
          and p.org_id = new.org_id
          and p.role = 'client_viewer'
    ) then
        raise exception 'profile must belong to the organization and have client_viewer role';
    end if;
    return new;
end;
$$;

create trigger validate_client_access_before_write
before insert or update on public.profile_client_access
for each row execute function public.validate_client_access();

-- Keep invoice totals synchronized with their line items.
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
            ), 0) * (1 + i.tax_rate / 100),
            2
        )
    where i.id in (old.invoice_id, new.invoice_id);
    return coalesce(new, old);
end;
$$;

create constraint trigger recalculate_invoice_totals_after_item_change
after insert or update or delete on public.invoice_items
deferrable initially deferred
for each row execute function public.recalculate_invoice_totals();

-- Restrict the exposed surface to the authenticated API role.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
