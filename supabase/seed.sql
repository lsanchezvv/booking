-- Booking service test seed (NOR-58): the four reference businesses.
-- packages/booking/test/seed.test.ts asserts slots against this data with
-- now = 2026-11-20 12:00 UTC, so keep the two in sync.
--
-- Ids: the first character says which business a row belongs to
-- (a = Melvin, b = barbershop, c = hair salon, d = nail salon).
-- Times are written as Santo Domingo wall time (UTC-4, no DST).
-- Amounts are ISO 4217 minor units: RD$4,500.00 is 450000.

begin;

create function pg_temp.at(local_time text)
returns timestamptz
language sql
immutable
as $$
  select local_time::timestamp at time zone 'America/Santo_Domingo';
$$;

create function pg_temp.add_booking(
  p_business uuid,
  p_reference text,
  p_customer uuid,
  p_venue uuid,
  p_event uuid,
  p_status booking.booking_status,
  p_starts text,
  p_ends text,
  p_total integer,
  p_party integer default 1,
  p_hold_expires_at timestamptz default null
)
returns uuid
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into booking.booking (
    business_id, reference, customer_id, event_id, venue_id, status, source,
    starts_at, ends_at, party_size, total_minor, currency, payment_status,
    hold_expires_at, idempotency_key
  )
  values (
    p_business, p_reference, p_customer, p_event, p_venue, p_status, 'online',
    pg_temp.at(p_starts), pg_temp.at(p_ends), p_party, p_total, 'DOP', 'unpaid',
    p_hold_expires_at, 'seed-' || p_reference
  )
  returning id into new_id;

  insert into booking.booking_event (business_id, booking_id, type, to_status, actor_type)
  values (p_business, new_id, 'booking.created', p_status, 'customer');

  return new_id;
end;
$$;

create function pg_temp.add_item(
  p_business uuid,
  p_booking uuid,
  p_offering uuid,
  p_starts text,
  p_ends text,
  p_price integer,
  p_sort integer default 0
)
returns uuid
language sql
as $$
  insert into booking.booking_item (business_id, booking_id, offering_id, starts_at, ends_at, price_minor, currency, sort)
  values (p_business, p_booking, p_offering, pg_temp.at(p_starts), pg_temp.at(p_ends), p_price, 'DOP', p_sort)
  returning id;
$$;

create function pg_temp.add_allocation(
  p_business uuid,
  p_booking uuid,
  p_item uuid,
  p_resource uuid,
  p_starts text,
  p_ends text
)
returns void
language sql
as $$
  insert into booking.booking_allocation (business_id, booking_id, booking_item_id, resource_id, starts_at, ends_at)
  values (p_business, p_booking, p_item, p_resource, pg_temp.at(p_starts), pg_temp.at(p_ends));
$$;

-- ===========================================================================
-- a. Melvin Calderón Photography: the Christmas set event.
--    Manual approval, 20-minute grid, 12 bookings a day, 160 in total.
-- ===========================================================================

insert into booking.business (id, slug, name, vertical, timezone, currency, locale, slot_interval_min, default_policy_id, external_ref)
values ('a0000000-0000-4000-8000-000000000001', 'melvin', 'Melvin Calderón Photography', 'photography',
        'America/Santo_Domingo', 'DOP', 'es-DO', 20, 'a0000000-0000-4000-8000-000000000011', 'melvin-photo:studio:melvin');

insert into booking.booking_policy (id, business_id, name, approval_mode, hold_minutes, respond_within_hours, min_lead_minutes, max_advance_days, cancel_cutoff_hours, reminder_offsets_min)
values
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'Estándar', 'manual', 10, 48, 1440, 90, 48, '{1440}'),
  ('a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'Navidad', 'manual', 10, 24, 1440, 60, 48, '{1440,120}'),
  ('a0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'Navidad familiar', 'manual', 10, 12, 1440, 60, 72, '{1440,120}'),
  ('a0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'Mini sesión', 'instant', 10, null, 60, 30, 24, '{120}');

insert into booking.venue (id, business_id, name, kind, address, instructions)
values
  ('a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001', 'Estudio', 'on_site',
   '{"line1": "Calle Rafael Augusto Sánchez 45", "city": "Santo Domingo", "country": "DO"}', 'Segundo piso, puerta azul.'),
  ('a0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000001', 'Exterior, lugar acordado con el cliente', 'customer_address',
   null, null);

insert into booking.resource (id, business_id, venue_id, kind, name, external_user_ref, sort)
values
  ('a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', null, 'staff', 'Melvin', 'melvin-photo:user:melvin', 0),
  ('a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000021', 'space', 'Set navideño', null, 1);

insert into booking.offering_category (id, business_id, name)
values ('a0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'Sesiones');

insert into booking.offering (id, business_id, category_id, name, duration_min, price_minor, currency, price_type, min_party, max_party, policy_id, sort)
values
  ('a0000000-0000-4000-8000-000000000311', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000301',
   'Mini sesión navideña', 20, 450000, 'DOP', 'fixed', 1, 6, 'a0000000-0000-4000-8000-000000000014', 0),
  ('a0000000-0000-4000-8000-000000000312', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000301',
   'Sesión familiar navideña', 40, 750000, 'DOP', 'fixed', 1, 10, null, 1),
  ('a0000000-0000-4000-8000-000000000313', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000301',
   'Sesión de retrato', 60, 900000, 'DOP', 'from', 1, 2, null, 2);

insert into booking.offering_requirement (id, business_id, offering_id, resource_id)
values
  ('a0000000-0000-4000-8000-000000000401', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000311', 'a0000000-0000-4000-8000-000000000101'),
  ('a0000000-0000-4000-8000-000000000402', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000311', 'a0000000-0000-4000-8000-000000000102'),
  ('a0000000-0000-4000-8000-000000000403', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000312', 'a0000000-0000-4000-8000-000000000101'),
  ('a0000000-0000-4000-8000-000000000404', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000312', 'a0000000-0000-4000-8000-000000000102'),
  ('a0000000-0000-4000-8000-000000000405', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000313', 'a0000000-0000-4000-8000-000000000101');

insert into booking.event (id, business_id, venue_id, slug, title, status, starts_on, ends_on, publish_at, policy_id, slot_mode, slot_interval_min, external_ref)
values ('a0000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000021',
        'navidad-2026', 'Navidad 2026 en el set', 'published', '2026-11-28', '2026-12-21', '2026-11-01 00:00Z',
        'a0000000-0000-4000-8000-000000000012', 'grid', 20, 'melvin-photo:plan:navidad-2026');

insert into booking.event_offering (business_id, event_id, offering_id, policy_id, sort)
values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000311', null, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000312', 'a0000000-0000-4000-8000-000000000013', 1);

-- The studio is open every day; the event narrows it to Thu–Sun 9:00–17:00,
-- adds Monday 21 Dec in the morning and closes Sunday 13 Dec.
insert into booking.schedule (id, business_id, venue_id, event_id)
values
  ('a0000000-0000-4000-8000-000000000601', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000021', null),
  ('a0000000-0000-4000-8000-000000000602', 'a0000000-0000-4000-8000-000000000001', null, 'a0000000-0000-4000-8000-000000000501');

insert into booking.schedule_rule (business_id, schedule_id, weekday, start_time, end_time)
select 'a0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000601'::uuid, d, '08:00'::time, '19:00'::time
from generate_series(0, 6) d
union all
select 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000602', d, '09:00', '17:00'
from unnest(array[4, 5, 6, 0]) d;

insert into booking.schedule_exception (business_id, schedule_id, date, kind, start_time, end_time)
values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000602', '2026-12-21', 'open', '09:00', '13:00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000602', '2026-12-13', 'closed', null, null);

insert into booking.time_off (business_id, resource_id, starts_at, ends_at, reason, created_by_ref)
values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000101',
        pg_temp.at('2026-12-04 12:00'), pg_temp.at('2026-12-04 13:00'), 'Almuerzo', 'melvin-photo:user:melvin');

insert into booking.capacity_rule (business_id, event_id, period, unit, max_count)
values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000501', 'day', 'bookings', 12),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000501', 'total', 'bookings', 160);

insert into booking.question (id, business_id, event_id, label, kind, required)
values ('a0000000-0000-4000-8000-000000000701', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000501',
        '¿Cuántas personas participarán?', 'number', true);

insert into booking.customer (id, business_id, name, email, phone_e164, locale)
values
  ('a0000000-0000-4000-8000-000000000801', 'a0000000-0000-4000-8000-000000000001', 'Familia Taveras', 'taveras@example.com', '+18095550101', 'es-DO'),
  ('a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000000001', 'Laura Peña', 'laura.pena@example.com', '+18295550102', 'es-DO'),
  ('a0000000-0000-4000-8000-000000000803', 'a0000000-0000-4000-8000-000000000001', 'Carlos Méndez', null, '+18495550103', 'es-DO');

do $$
declare
  biz constant uuid := 'a0000000-0000-4000-8000-000000000001';
  studio constant uuid := 'a0000000-0000-4000-8000-000000000021';
  navidad constant uuid := 'a0000000-0000-4000-8000-000000000501';
  melvin constant uuid := 'a0000000-0000-4000-8000-000000000101';
  christmas_set constant uuid := 'a0000000-0000-4000-8000-000000000102';
  mini constant uuid := 'a0000000-0000-4000-8000-000000000311';
  familia constant uuid := 'a0000000-0000-4000-8000-000000000312';
  b uuid;
  i uuid;
  s text;
  e text;
begin
  -- Saturday 5 Dec is full: 12 confirmed mini sessions from 9:00.
  for n in 0..11 loop
    s := to_char('2026-12-05 09:00'::timestamp + n * interval '20 minutes', 'YYYY-MM-DD HH24:MI');
    e := to_char('2026-12-05 09:20'::timestamp + n * interval '20 minutes', 'YYYY-MM-DD HH24:MI');
    b := pg_temp.add_booking(biz, 'MC-' || lpad((n + 1)::text, 4, '0'), 'a0000000-0000-4000-8000-000000000802',
                             studio, navidad, 'confirmed', s, e, 450000);
    i := pg_temp.add_item(biz, b, mini, s, e, 450000);
    perform pg_temp.add_allocation(biz, b, i, melvin, s, e);
    perform pg_temp.add_allocation(biz, b, i, christmas_set, s, e);
  end loop;

  -- Sunday 6 Dec: one confirmed, one pending (counts toward capacity), and
  -- a hold that expired before "now" and must be ignored.
  b := pg_temp.add_booking(biz, 'MC-0101', 'a0000000-0000-4000-8000-000000000801', studio, navidad,
                           'confirmed', '2026-12-06 09:00', '2026-12-06 09:20', 450000, 3);
  i := pg_temp.add_item(biz, b, mini, '2026-12-06 09:00', '2026-12-06 09:20', 450000);
  perform pg_temp.add_allocation(biz, b, i, melvin, '2026-12-06 09:00', '2026-12-06 09:20');
  perform pg_temp.add_allocation(biz, b, i, christmas_set, '2026-12-06 09:00', '2026-12-06 09:20');
  insert into booking.booking_answer (business_id, booking_id, question_id, value)
  values (biz, b, 'a0000000-0000-4000-8000-000000000701', '3');

  b := pg_temp.add_booking(biz, 'MC-0102', 'a0000000-0000-4000-8000-000000000801', studio, navidad,
                           'pending', '2026-12-06 09:40', '2026-12-06 10:20', 750000, 5);
  i := pg_temp.add_item(biz, b, familia, '2026-12-06 09:40', '2026-12-06 10:20', 750000);
  perform pg_temp.add_allocation(biz, b, i, melvin, '2026-12-06 09:40', '2026-12-06 10:20');
  perform pg_temp.add_allocation(biz, b, i, christmas_set, '2026-12-06 09:40', '2026-12-06 10:20');

  b := pg_temp.add_booking(biz, 'MC-0103', 'a0000000-0000-4000-8000-000000000803', studio, navidad,
                           'hold', '2026-12-06 11:00', '2026-12-06 11:20', 450000, 1, '2026-11-15 12:00Z');
  i := pg_temp.add_item(biz, b, mini, '2026-12-06 11:00', '2026-12-06 11:20', 450000);
  perform pg_temp.add_allocation(biz, b, i, melvin, '2026-12-06 11:00', '2026-12-06 11:20');
  perform pg_temp.add_allocation(biz, b, i, christmas_set, '2026-12-06 11:00', '2026-12-06 11:20');
end;
$$;

insert into booking.api_client (id, business_id, name, key_hash, scopes)
values ('a0000000-0000-4000-8000-000000000901', 'a0000000-0000-4000-8000-000000000001', 'melvin-photo',
        encode(sha256('local-dev-key'::bytea), 'hex'), '{availability:read,bookings:write}');

insert into booking.webhook_endpoint (business_id, api_client_id, url, secret, event_types)
values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000901',
        'http://localhost:3000/api/webhooks/booking', 'whsec_local_dev',
        '{booking.requested,booking.confirmed,booking.cancelled,booking.reminder_due}');

-- ===========================================================================
-- b. Barbería El Corte: three barbers, the customer may choose one.
-- ===========================================================================

insert into booking.business (id, slug, name, vertical, timezone, currency, locale, slot_interval_min, default_policy_id)
values ('b0000000-0000-4000-8000-000000000001', 'barberia-el-corte', 'Barbería El Corte', 'barbershop',
        'America/Santo_Domingo', 'DOP', 'es-DO', 15, 'b0000000-0000-4000-8000-000000000011');

insert into booking.booking_policy (id, business_id, name, approval_mode, min_lead_minutes, max_advance_days, cancel_cutoff_hours, reminder_offsets_min)
values ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Estándar', 'instant', 60, 30, 2, '{120}');

insert into booking.venue (id, business_id, name, address)
values ('b0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000001', 'Sucursal Naco',
        '{"line1": "Av. Tiradentes 12", "city": "Santo Domingo", "country": "DO"}');

insert into booking.resource (id, business_id, venue_id, kind, name, sort)
values
  ('b0000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000021', 'staff', 'Juan', 0),
  ('b0000000-0000-4000-8000-000000000102', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000021', 'staff', 'Pedro', 1),
  ('b0000000-0000-4000-8000-000000000103', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000021', 'staff', 'Luis', 2);

insert into booking.resource_pool (id, business_id, name, selection)
values ('b0000000-0000-4000-8000-000000000201', 'b0000000-0000-4000-8000-000000000001', 'Barberos', 'customer_choice');

insert into booking.resource_pool_member (business_id, pool_id, resource_id)
select 'b0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000201'::uuid, id
from booking.resource where business_id = 'b0000000-0000-4000-8000-000000000001';

insert into booking.offering (id, business_id, name, duration_min, price_minor, currency, sort)
values
  ('b0000000-0000-4000-8000-000000000311', 'b0000000-0000-4000-8000-000000000001', 'Corte', 30, 50000, 'DOP', 0),
  ('b0000000-0000-4000-8000-000000000312', 'b0000000-0000-4000-8000-000000000001', 'Barba', 15, 30000, 'DOP', 1);

insert into booking.offering_requirement (business_id, offering_id, pool_id)
values
  ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000311', 'b0000000-0000-4000-8000-000000000201'),
  ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000312', 'b0000000-0000-4000-8000-000000000201');

insert into booking.schedule (id, business_id, venue_id, resource_id)
values
  ('b0000000-0000-4000-8000-000000000601', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000021', null),
  ('b0000000-0000-4000-8000-000000000602', 'b0000000-0000-4000-8000-000000000001', null, 'b0000000-0000-4000-8000-000000000101'),
  ('b0000000-0000-4000-8000-000000000603', 'b0000000-0000-4000-8000-000000000001', null, 'b0000000-0000-4000-8000-000000000102'),
  ('b0000000-0000-4000-8000-000000000604', 'b0000000-0000-4000-8000-000000000001', null, 'b0000000-0000-4000-8000-000000000103');

-- Shop Mon–Sat 9–19. Juan Mon–Sat 9–17, Pedro Tue–Sat 11–19, Luis Mon–Fri 9–19.
insert into booking.schedule_rule (business_id, schedule_id, weekday, start_time, end_time)
select 'b0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000601'::uuid, d, '09:00'::time, '19:00'::time from generate_series(1, 6) d
union all
select 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000602', d, '09:00', '17:00' from generate_series(1, 6) d
union all
select 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000603', d, '11:00', '19:00' from generate_series(2, 6) d
union all
select 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000604', d, '09:00', '19:00' from generate_series(1, 5) d;

insert into booking.time_off (business_id, resource_id, starts_at, ends_at, reason)
values ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000103',
        pg_temp.at('2026-12-07 00:00'), pg_temp.at('2026-12-12 00:00'), 'Vacaciones');

insert into booking.customer (id, business_id, name, email, phone_e164)
values
  ('b0000000-0000-4000-8000-000000000801', 'b0000000-0000-4000-8000-000000000001', 'Rafael Gómez', 'rafa@example.com', '+18095550201'),
  ('b0000000-0000-4000-8000-000000000802', 'b0000000-0000-4000-8000-000000000001', 'Cliente sin cita', null, null);

do $$
declare
  biz constant uuid := 'b0000000-0000-4000-8000-000000000001';
  shop constant uuid := 'b0000000-0000-4000-8000-000000000021';
  corte constant uuid := 'b0000000-0000-4000-8000-000000000311';
  b uuid;
  i uuid;
begin
  -- Tuesday 1 Dec: Juan cuts at 10:00, Pedro at 11:00.
  b := pg_temp.add_booking(biz, 'EC-0001', 'b0000000-0000-4000-8000-000000000801', shop, null,
                           'confirmed', '2026-12-01 10:00', '2026-12-01 10:30', 50000);
  i := pg_temp.add_item(biz, b, corte, '2026-12-01 10:00', '2026-12-01 10:30', 50000);
  perform pg_temp.add_allocation(biz, b, i, 'b0000000-0000-4000-8000-000000000101', '2026-12-01 10:00', '2026-12-01 10:30');

  b := pg_temp.add_booking(biz, 'EC-0002', 'b0000000-0000-4000-8000-000000000802', shop, null,
                           'confirmed', '2026-12-01 11:00', '2026-12-01 11:30', 50000);
  update booking.booking set source = 'walk_in' where id = b;
  i := pg_temp.add_item(biz, b, corte, '2026-12-01 11:00', '2026-12-01 11:30', 50000);
  perform pg_temp.add_allocation(biz, b, i, 'b0000000-0000-4000-8000-000000000102', '2026-12-01 11:00', '2026-12-01 11:30');
end;
$$;

-- ===========================================================================
-- c. Salón Bella: colour frees the stylist while it processes.
--    Colour is 120 min. The stylist is needed for 0–30 and 75–120 (same
--    stylist, via link_key) and a wash station for 0–15.
-- ===========================================================================

insert into booking.business (id, slug, name, vertical, timezone, currency, locale, slot_interval_min, default_policy_id)
values ('c0000000-0000-4000-8000-000000000001', 'salon-bella', 'Salón Bella', 'hair_salon',
        'America/Santo_Domingo', 'DOP', 'es-DO', 15, 'c0000000-0000-4000-8000-000000000011');

insert into booking.booking_policy (id, business_id, name, approval_mode, min_lead_minutes, max_advance_days, cancel_cutoff_hours)
values ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000001', 'Estándar', 'instant', 120, 60, 24);

insert into booking.venue (id, business_id, name)
values ('c0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000001', 'Salón Piantini');

insert into booking.resource (id, business_id, venue_id, kind, name, sort)
values
  ('c0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000021', 'staff', 'Ana', 0),
  ('c0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000021', 'staff', 'Carla', 1),
  ('c0000000-0000-4000-8000-000000000111', 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000021', 'equipment', 'Lavacabezas 1', 2),
  ('c0000000-0000-4000-8000-000000000112', 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000021', 'equipment', 'Lavacabezas 2', 3);

insert into booking.resource_pool (id, business_id, name, selection)
values
  ('c0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000001', 'Estilistas', 'customer_choice'),
  ('c0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000001', 'Lavacabezas', 'any');

insert into booking.resource_pool_member (business_id, pool_id, resource_id)
values
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000101'),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000102'),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000111'),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000112');

insert into booking.offering (id, business_id, name, duration_min, price_minor, currency, price_type, sort)
values
  ('c0000000-0000-4000-8000-000000000311', 'c0000000-0000-4000-8000-000000000001', 'Color', 120, 350000, 'DOP', 'from', 0),
  ('c0000000-0000-4000-8000-000000000312', 'c0000000-0000-4000-8000-000000000001', 'Corte de dama', 45, 150000, 'DOP', 'fixed', 1);

insert into booking.offering_requirement (business_id, offering_id, pool_id, offset_min, length_min, link_key)
values
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000311', 'c0000000-0000-4000-8000-000000000201', 0, 30, 'stylist'),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000311', 'c0000000-0000-4000-8000-000000000201', 75, 45, 'stylist'),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000311', 'c0000000-0000-4000-8000-000000000202', 0, 15, null),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000312', 'c0000000-0000-4000-8000-000000000201', 0, null, null);

insert into booking.schedule (id, business_id, venue_id)
values ('c0000000-0000-4000-8000-000000000601', 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000021');

insert into booking.schedule_rule (business_id, schedule_id, weekday, start_time, end_time)
select 'c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000601'::uuid, d, '09:00'::time, '18:00'::time from generate_series(2, 6) d;

insert into booking.customer (id, business_id, name, email, phone_e164)
values ('c0000000-0000-4000-8000-000000000801', 'c0000000-0000-4000-8000-000000000001', 'María Fernández', 'maria@example.com', '+18095550301');

do $$
declare
  biz constant uuid := 'c0000000-0000-4000-8000-000000000001';
  ana constant uuid := 'c0000000-0000-4000-8000-000000000101';
  b uuid;
  i uuid;
begin
  -- Wednesday 2 Dec: colour with Ana at 10:00. Ana is free 10:30–11:15.
  b := pg_temp.add_booking(biz, 'SB-0001', 'c0000000-0000-4000-8000-000000000801', 'c0000000-0000-4000-8000-000000000021', null,
                           'confirmed', '2026-12-02 10:00', '2026-12-02 12:00', 350000);
  i := pg_temp.add_item(biz, b, 'c0000000-0000-4000-8000-000000000311', '2026-12-02 10:00', '2026-12-02 12:00', 350000);
  perform pg_temp.add_allocation(biz, b, i, ana, '2026-12-02 10:00', '2026-12-02 10:30');
  perform pg_temp.add_allocation(biz, b, i, ana, '2026-12-02 11:15', '2026-12-02 12:00');
  perform pg_temp.add_allocation(biz, b, i, 'c0000000-0000-4000-8000-000000000111', '2026-12-02 10:00', '2026-12-02 10:15');
end;
$$;

-- ===========================================================================
-- d. Nails & Co: manicure and pedicure at the same time, two technicians.
-- ===========================================================================

insert into booking.business (id, slug, name, vertical, timezone, currency, locale, slot_interval_min, default_policy_id)
values ('d0000000-0000-4000-8000-000000000001', 'nails-and-co', 'Nails & Co', 'nail_salon',
        'America/Santo_Domingo', 'DOP', 'es-DO', 15, 'd0000000-0000-4000-8000-000000000011');

insert into booking.booking_policy (id, business_id, name, approval_mode, min_lead_minutes, max_advance_days, cancel_cutoff_hours)
values ('d0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'Estándar', 'instant', 60, 60, 12);

insert into booking.venue (id, business_id, name)
values ('d0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000001', 'Local Bella Vista');

insert into booking.resource (id, business_id, venue_id, kind, name, sort)
values
  ('d0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000021', 'staff', 'Sofía', 0),
  ('d0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000021', 'staff', 'Valeria', 1);

insert into booking.resource_pool (id, business_id, name, selection)
values ('d0000000-0000-4000-8000-000000000201', 'd0000000-0000-4000-8000-000000000001', 'Técnicas', 'any');

insert into booking.resource_pool_member (business_id, pool_id, resource_id)
values
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000201', 'd0000000-0000-4000-8000-000000000101'),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000201', 'd0000000-0000-4000-8000-000000000102');

insert into booking.offering (id, business_id, name, duration_min, price_minor, currency, sort)
values
  ('d0000000-0000-4000-8000-000000000311', 'd0000000-0000-4000-8000-000000000001', 'Manicura', 45, 80000, 'DOP', 0),
  ('d0000000-0000-4000-8000-000000000312', 'd0000000-0000-4000-8000-000000000001', 'Pedicura', 60, 120000, 'DOP', 1);

insert into booking.offering_requirement (business_id, offering_id, pool_id)
values
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000311', 'd0000000-0000-4000-8000-000000000201'),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000312', 'd0000000-0000-4000-8000-000000000201');

insert into booking.schedule (id, business_id, venue_id)
values ('d0000000-0000-4000-8000-000000000601', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000021');

insert into booking.schedule_rule (business_id, schedule_id, weekday, start_time, end_time)
select 'd0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000601'::uuid, d, '10:00'::time, '19:00'::time from generate_series(1, 6) d;

insert into booking.customer (id, business_id, name, email, phone_e164)
values ('d0000000-0000-4000-8000-000000000801', 'd0000000-0000-4000-8000-000000000001', 'Paola Rosario', 'paola@example.com', '+18295550401');

do $$
declare
  biz constant uuid := 'd0000000-0000-4000-8000-000000000001';
  venue constant uuid := 'd0000000-0000-4000-8000-000000000021';
  sofia constant uuid := 'd0000000-0000-4000-8000-000000000101';
  valeria constant uuid := 'd0000000-0000-4000-8000-000000000102';
  b uuid;
  i uuid;
begin
  -- Thursday 3 Dec: Sofía does a pedicure 10:00–11:00.
  b := pg_temp.add_booking(biz, 'NC-0001', 'd0000000-0000-4000-8000-000000000801', venue, null,
                           'confirmed', '2026-12-03 10:00', '2026-12-03 11:00', 120000);
  i := pg_temp.add_item(biz, b, 'd0000000-0000-4000-8000-000000000312', '2026-12-03 10:00', '2026-12-03 11:00', 120000);
  perform pg_temp.add_allocation(biz, b, i, sofia, '2026-12-03 10:00', '2026-12-03 11:00');

  -- Friday 4 Dec at 15:00: one booking, two items in parallel.
  b := pg_temp.add_booking(biz, 'NC-0002', 'd0000000-0000-4000-8000-000000000801', venue, null,
                           'confirmed', '2026-12-04 15:00', '2026-12-04 16:00', 200000);
  i := pg_temp.add_item(biz, b, 'd0000000-0000-4000-8000-000000000311', '2026-12-04 15:00', '2026-12-04 15:45', 80000, 0);
  perform pg_temp.add_allocation(biz, b, i, sofia, '2026-12-04 15:00', '2026-12-04 15:45');
  i := pg_temp.add_item(biz, b, 'd0000000-0000-4000-8000-000000000312', '2026-12-04 15:00', '2026-12-04 16:00', 120000, 1);
  perform pg_temp.add_allocation(biz, b, i, valeria, '2026-12-04 15:00', '2026-12-04 16:00');
end;
$$;
commit;
