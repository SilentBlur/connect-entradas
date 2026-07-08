-- ============================================================
-- Connect · Entradas — Esquema de base de datos (Supabase / Postgres)
--
-- CÓMO USARLO:
--   1. Entrá a tu proyecto en https://supabase.com
--   2. Menú izquierdo → "SQL Editor" → "New query"
--   3. Pegá TODO este archivo y apretá "Run".
--
-- Es seguro correrlo varias veces (idempotente).
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
  user_id    uuid,                        -- cliente (cuenta) que reclamó la entrada
  created_at bigint,
  claimed_at bigint,
  used_at    bigint
);
alter table public.tickets add column if not exists user_id uuid;
create index if not exists tickets_event_idx on public.tickets(event_id);
create index if not exists tickets_code_idx  on public.tickets(event_id, code);
create index if not exists tickets_user_idx  on public.tickets(user_id);

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
-- 1.5) CUENTAS DE USUARIO (perfiles + roles)
--   Todos (admins y clientes) viven en Supabase Auth.
--   profiles.role distingue 'admin' (vos + Italo) de 'customer' (público).
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  role       text default 'customer',     -- admin | customer
  created_at timestamptz default now()
);

-- ¿El usuario actual es admin? (lista fija de mails + tabla profiles, a prueba de bloqueos)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((auth.jwt() ->> 'email') in ('matiasgv_26@hotmail.com','ibindac@gmail.com'), false)
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Al crearse un usuario nuevo en Auth, se crea su perfil (cliente por defecto)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: crea perfiles para los usuarios que ya existían
insert into public.profiles (id, email, name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'name', ''), 'customer'
from auth.users u
on conflict (id) do nothing;

-- Marca como admin a los dueños (por si la lista de mails cambiara)
update public.profiles set role = 'admin'
where email in ('matiasgv_26@hotmail.com','ibindac@gmail.com');

-- Cambiar el propio nombre (el cliente, desde su configuración)
drop function if exists public.update_my_name(text);
create function public.update_my_name(p_name text)
returns void language sql security definer set search_path = public as $$
  update public.profiles set name = p_name where id = auth.uid();
$$;

-- Entradas del cliente logueado (para su hub), con datos del evento y tipo
drop function if exists public.my_tickets();
create function public.my_tickets()
returns table(id text, code text, status text, payment text, type_name text, color text,
              event_id text, event_name text, date_iso text, start_time text, venue text,
              created_at bigint, used_at bigint)
language sql security definer set search_path = public as $$
  select t.id, t.code, t.status, t.payment, tt.name, tt.color,
         e.id, e.name, e.date_iso, e.start_time, e.venue, t.created_at, t.used_at
  from tickets t
  join events e on e.id = t.event_id
  left join ticket_types tt on tt.id = t.type_id
  where t.user_id = auth.uid()
  order by e.date_iso desc nulls last, t.created_at desc;
$$;

-- ============================================================
-- 2) ROW LEVEL SECURITY
--    Admin (is_admin) = acceso total a la gestión.
--    Cliente (logueado) = solo SUS entradas y su perfil.
--    Público (anon) = leer info de eventos/tipos + reclamar por funciones.
-- ============================================================

alter table public.events       enable row level security;
alter table public.ticket_types enable row level security;
alter table public.cabezas      enable row level security;
alter table public.tickets      enable row level security;
alter table public.requests     enable row level security;
alter table public.settings     enable row level security;
alter table public.profiles     enable row level security;

-- ---- Admin: acceso total SOLO si is_admin() ----
do $$
declare t text;
begin
  foreach t in array array['events','ticket_types','cabezas','tickets','requests','settings'] loop
    execute format('drop policy if exists admin_all on public.%I;', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- ---- Público + clientes: lectura de eventos y tipos (cualquier rol) ----
drop policy if exists public_read_events on public.events;
create policy public_read_events on public.events for select using (true);

drop policy if exists public_read_types on public.ticket_types;
create policy public_read_types on public.ticket_types for select using (active is true);

-- ---- Cliente: puede ver SOLO sus propias entradas ----
drop policy if exists tickets_owner_select on public.tickets;
create policy tickets_owner_select on public.tickets for select to authenticated using (user_id = auth.uid());

-- ---- Perfiles: cada uno ve/edita el suyo (admins ven todos) ----
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());

-- (cabezas, requests y el resto de tickets NO tienen acceso directo: se usan las funciones de abajo)

-- ============================================================
-- 3) FUNCIONES SEGURAS  (lo que usan las páginas públicas)
--    "security definer" = corren con permisos del dueño.
-- ============================================================

-- Buscar una entrada por código (para reclamarla)
drop function if exists public.lookup_ticket(text, text);
create function public.lookup_ticket(p_event_id text, p_code text)
returns table(id text, status text, type_id text, type_name text, event_name text, code text)
language sql security definer set search_path = public as $$
  select t.id, t.status, t.type_id, tt.name, e.name, t.code
  from tickets t
  join events e on e.id = t.event_id
  left join ticket_types tt on tt.id = t.type_id
  where t.event_id = p_event_id and upper(t.code) = upper(p_code)
  limit 1;
$$;

-- Reclamar la entrada (asigna titular, la valida y la liga a la cuenta del cliente)
drop function if exists public.claim_ticket(text, text, text, text, text, text);
create function public.claim_ticket(
  p_id text, p_name text, p_dni text, p_email text, p_phone text, p_cabeza_id text default null)
returns table(id text, token text, status text)
language plpgsql security definer set search_path = public as $$
declare v_status text; v_event text; v_uid uuid;
begin
  v_uid := auth.uid();
  select t.status, t.event_id into v_status, v_event from tickets t where t.id = p_id for update;
  if v_status is null then raise exception 'not_found'; end if;
  if v_status = 'void' then raise exception 'void'; end if;
  if v_status = 'used' then raise exception 'used'; end if;
  if v_status <> 'unclaimed' then raise exception 'already_claimed'; end if;

  -- UNA entrada por cuenta y por evento: cada persona reclama la SUYA, no la de otro.
  if v_uid is not null and exists (
    select 1 from tickets t2
    where t2.user_id = v_uid and t2.event_id = v_event
      and t2.status in ('valid','used') and t2.id <> p_id
  ) then
    raise exception 'already_has_ticket';
  end if;

  return query
    update tickets set
      holder     = jsonb_build_object('name',p_name,'dni',coalesce(p_dni,''),
                                       'email',coalesce(p_email,''),'phone',coalesce(p_phone,'')),
      status     = 'valid',
      cabeza_id  = coalesce(tickets.cabeza_id, p_cabeza_id),
      user_id    = coalesce(auth.uid(), tickets.user_id),
      claimed_at = (extract(epoch from now())*1000)::bigint
    where tickets.id = p_id
    returning tickets.id, tickets.token, tickets.status;
end;
$$;

-- Ver una entrada pública (incluye token para dibujar el QR)
drop function if exists public.get_ticket(text);
create function public.get_ticket(p_id text)
returns table(id text, token text, status text, holder jsonb, code text, event_id text, type_id text)
language sql security definer set search_path = public as $$
  select t.id, t.token, t.status, t.holder, t.code, t.event_id, t.type_id
  from tickets t
  where t.id = p_id
  limit 1;
$$;

-- Enviar una solicitud desde el link de un cabeza (sin login)
drop function if exists public.submit_request(text, text, text, text, text, text, text, text);
create function public.submit_request(
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

-- Nombre de un cabeza (para el encabezado de su panel público)
drop function if exists public.get_cabeza(text);
create function public.get_cabeza(p_id text)
returns table(id text, name text)
language sql security definer set search_path = public as $$
  select id, name from cabezas where id = p_id limit 1;
$$;

-- Entradas de un cabeza para su panel público
drop function if exists public.panel_tickets(text, text);
create function public.panel_tickets(p_event_id text, p_cabeza_id text)
returns table(id text, code text, status text, payment text, price numeric,
              type_id text, type_name text, color text, holder jsonb, created_at bigint)
language sql security definer set search_path = public as $$
  select t.id, t.code, t.status, t.payment, t.price, t.type_id, tt.name, tt.color, t.holder, t.created_at
  from tickets t
  left join ticket_types tt on tt.id = t.type_id
  where t.event_id = p_event_id and t.cabeza_id = p_cabeza_id and t.status <> 'void'
  order by t.created_at desc;
$$;

-- Registrar el INGRESO de forma ATÓMICA y autoritativa.
--   Bloquea la fila (for update): si dos puertas escanean el mismo QR a la vez,
--   una gana ('ok') y la otra recibe 'already'. Imposible el doble ingreso.
--   Devuelve el resultado + datos para pintar el resultado en el escáner.
drop function if exists public.scan_ticket(text, text);
create function public.scan_ticket(p_id text, p_event_id text default null)
returns table(
  result      text,   -- ok | already | unclaimed | void | other_event | not_found
  ticket_id   text,
  code        text,
  status      text,
  holder      jsonb,
  type_name   text,
  event_id    text,
  event_name  text,
  cabeza_name text,
  used_at     bigint
)
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_event  text;
  v_res    text;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  -- Bloqueo de fila: serializa los escaneos simultáneos del mismo código
  select t.status, t.event_id into v_status, v_event
  from tickets t where t.id = p_id
  for update;

  if v_status is null then
    result := 'not_found';
    return next;
    return;
  end if;

  if p_event_id is not null and v_event is distinct from p_event_id then
    v_res := 'other_event';
  elsif v_status = 'void' then
    v_res := 'void';
  elsif v_status = 'unclaimed' then
    v_res := 'unclaimed';
  elsif v_status = 'used' then
    v_res := 'already';
  elsif v_status = 'valid' then
    update tickets t
      set status  = 'used',
          used_at = (extract(epoch from now())*1000)::bigint
      where t.id = p_id;
    v_res := 'ok';
  else
    v_res := 'already';
  end if;

  return query
    select v_res, t.id, t.code, t.status, t.holder,
           tt.name, t.event_id, e.name, cb.name, t.used_at
    from tickets t
    left join ticket_types tt on tt.id = t.type_id
    left join events      e  on e.id  = t.event_id
    left join cabezas     cb on cb.id = t.cabeza_id
    where t.id = p_id;
end;
$$;

-- Permisos de ejecución
grant execute on function public.lookup_ticket(text,text)                                to anon, authenticated;
grant execute on function public.claim_ticket(text,text,text,text,text,text)             to anon, authenticated;
grant execute on function public.get_ticket(text)                                        to anon, authenticated;
grant execute on function public.submit_request(text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.get_cabeza(text)                                        to anon, authenticated;
grant execute on function public.panel_tickets(text,text)                                to anon, authenticated;
grant execute on function public.scan_ticket(text,text)                                  to authenticated;
grant execute on function public.update_my_name(text)                                    to authenticated;
grant execute on function public.my_tickets()                                            to authenticated;
grant execute on function public.is_admin()                                              to anon, authenticated;

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

-- ✅ Listo. Base con cuentas, roles y seguridad por usuario.
