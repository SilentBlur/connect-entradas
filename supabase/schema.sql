-- ============================================================
-- Connect · Entradas — Esquema de base de datos (Supabase / Postgres)
--
-- CÓMO USARLO:
--   1. Entrá a tu proyecto en https://supabase.com
--   2. Menú izquierdo → "SQL Editor" → "New query"
--   3. Pegá TODO este archivo y apretá "Run".
--
-- Es seguro correrlo varias veces (usa IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ============================================================
-- 1) TABLAS  (calcan el modelo de datos del app)
-- ============================================================

create table if not exists public.events (
  id          text primary key,
  name        text not null,
  status      text default 'draft',
  description text,
  date_iso    text,
  start_time  text,            -- (en el app: ev.time)
  venue       text,
  address     text,
  city        text,
  cover       text,
  created_at  bigint
);

create table if not exists public.ticket_types (
  id        text primary key,
  event_id  text references public.events(id) on delete cascade,
  name      text not null,
  kind      text default 'general',   -- box | general
  access    text default 'paid',      -- paid | courtesy | free
  price     numeric default 0,
  capacity  int default 0,
  color     text,
  includes  jsonb default '[]'::jsonb,
  descr     text,                      -- (en el app: type.desc)
  active    boolean default true
);

create table if not exists public.cabezas (
  id         text primary key,
  name       text not null,
  phone      text,
  email      text,
  prefix     text,
  created_at bigint
);

create table if not exists public.tickets (
  id         text primary key,
  code       text,
  token      text,
  event_id   text references public.events(id) on delete cascade,
  type_id    text,
  cabeza_id  text,
  holder     jsonb default '{}'::jsonb,   -- {name,dni,email,phone}
  status     text default 'unclaimed',    -- unclaimed | valid | used | void
  payment    text default 'paid',         -- paid | pending | courtesy | free
  price      numeric default 0,
  source     text default 'admin',
  created_at bigint,
  claimed_at bigint,
  used_at    bigint
);
create index if not exists tickets_event_idx on public.tickets(event_id);
create index if not exists tickets_code_idx  on public.tickets(event_id, code);

create table if not exists public.requests (
  id         text primary key,
  event_id   text references public.events(id) on delete cascade,
  cabeza_id  text,
  type_id    text,
  name       text,
  dni        text,
  email      text,
  phone      text,
  note       text,
  status     text default 'pending',
  created_at bigint
);

-- Configuración global (una sola fila)
create table if not exists public.settings (
  id               int primary key default 1,
  org              text default 'Connect',
  currency         text default 'PEN',
  symbol           text default 'S/',
  active_event_id  text,
  scan_pin         text,
  pay_info         text,
  base_url         text,
  constraint settings_singleton check (id = 1)
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- 2) ROW LEVEL SECURITY
--    Admin (logueado) = acceso total.
--    Público (anon)   = solo leer info de eventos/tipos.
--    Reclamar / solicitar entradas = vía funciones seguras (abajo).
-- ============================================================

alter table public.events       enable row level security;
alter table public.ticket_types enable row level security;
alter table public.cabezas      enable row level security;
alter table public.tickets      enable row level security;
alter table public.requests     enable row level security;
alter table public.settings     enable row level security;

-- ---- Admin: acceso total para usuarios autenticados ----
do $$
declare t text;
begin
  foreach t in array array['events','ticket_types','cabezas','tickets','requests','settings'] loop
    execute format('drop policy if exists admin_all on public.%I;', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ---- Público: solo lectura de eventos y tipos (para la página de reclamo) ----
drop policy if exists public_read_events on public.events;
create policy public_read_events on public.events
  for select to anon using (true);

drop policy if exists public_read_types on public.ticket_types;
create policy public_read_types on public.ticket_types
  for select to anon using (active is true);

-- (cabezas, tickets y requests NO tienen acceso directo para anon: se usan las funciones de abajo)

-- ============================================================
-- 3) FUNCIONES SEGURAS  (lo que usan las páginas públicas)
--    "security definer" = corren con permisos del dueño, así
--    el cliente NO puede leer toda la base, solo lo justo.
-- ============================================================

-- Buscar una entrada por código (para reclamarla)
create or replace function public.lookup_ticket(p_event_id text, p_code text)
returns table(id text, status text, type_name text, event_name text)
language sql security definer set search_path = public as $$
  select t.id, t.status, tt.name, e.name
  from tickets t
  join events e on e.id = t.event_id
  left join ticket_types tt on tt.id = t.type_id
  where t.event_id = p_event_id and upper(t.code) = upper(p_code)
  limit 1;
$$;

-- Reclamar la entrada (asigna los datos del titular y la valida)
create or replace function public.claim_ticket(
  p_id text, p_name text, p_dni text, p_email text, p_phone text, p_cabeza_id text default null)
returns table(id text, token text, status text)
language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select t.status into v_status from tickets t where t.id = p_id for update;
  if v_status is null then raise exception 'not_found'; end if;
  if v_status = 'void' then raise exception 'void'; end if;
  if v_status = 'used' then raise exception 'used'; end if;
  if v_status <> 'unclaimed' then raise exception 'already_claimed'; end if;

  return query
    update tickets set
      holder     = jsonb_build_object('name',p_name,'dni',coalesce(p_dni,''),
                                       'email',coalesce(p_email,''),'phone',coalesce(p_phone,'')),
      status     = 'valid',
      cabeza_id  = coalesce(tickets.cabeza_id, p_cabeza_id),
      claimed_at = (extract(epoch from now())*1000)::bigint
    where tickets.id = p_id
    returning tickets.id, tickets.token, tickets.status;
end;
$$;

-- Ver una entrada pública (incluye token para dibujar el QR)
create or replace function public.get_ticket(p_id text)
returns table(id text, token text, status text, holder jsonb,
              type_name text, event_name text, date_iso text, venue text)
language sql security definer set search_path = public as $$
  select t.id, t.token, t.status, t.holder, tt.name, e.name, e.date_iso, e.venue
  from tickets t
  join events e on e.id = t.event_id
  left join ticket_types tt on tt.id = t.type_id
  where t.id = p_id
  limit 1;
$$;

-- Enviar una solicitud desde el link de un cabeza (sin login)
create or replace function public.submit_request(
  p_event_id text, p_cabeza_id text, p_type_id text,
  p_name text, p_dni text, p_email text, p_phone text, p_note text)
returns text
language plpgsql security definer set search_path = public as $$
declare new_id text;
begin
  new_id := 'rq_' || substr(md5(random()::text || clock_timestamp()::text), 1, 7);
  insert into requests(id, event_id, cabeza_id, type_id, name, dni, email, phone, note, status, created_at)
  values (new_id, p_event_id, p_cabeza_id, p_type_id, p_name, p_dni, p_email, p_phone, p_note, 'pending',
          (extract(epoch from now())*1000)::bigint);
  return new_id;
end;
$$;

-- Permisos de ejecución para las páginas públicas
grant execute on function public.lookup_ticket(text,text)                              to anon, authenticated;
grant execute on function public.claim_ticket(text,text,text,text,text,text)           to anon, authenticated;
grant execute on function public.get_ticket(text)                                      to anon, authenticated;
grant execute on function public.submit_request(text,text,text,text,text,text,text,text) to anon, authenticated;

-- ============================================================
-- 4) REALTIME  (para que Matías e Italo vean los cambios en vivo)
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.events, public.ticket_types,
      public.cabezas, public.tickets, public.requests, public.settings;
  exception when duplicate_object then null;
  end;
end $$;

-- ✅ Listo. Tu base está creada y segura.
