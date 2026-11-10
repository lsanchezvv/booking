-- Booking service schema v1 (NOR-58). See docs/schema.md.
--
-- Tenancy: every table except business carries business_id, and every
-- reference between tenant tables is a composite (business_id, id) foreign key,
-- so a row can never point at another business's data.
--
-- Time: instants are timestamptz (UTC). Schedules and event dates are local
-- wall time, read in the venue's time zone (falling back to the business's).
--
-- Access: only service_role (the booking API and server code) reads or writes.
-- RLS is enabled and forced on every table with no policies, so anon and
-- authenticated see nothing even if grants change later.

create schema booking;

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type booking.vertical as enum ('photography', 'barbershop', 'hair_salon', 'nail_salon', 'spa', 'other');
create type booking.business_status as enum ('active', 'suspended', 'archived');
create type booking.venue_kind as enum ('on_site', 'customer_address', 'online');
create type booking.resource_kind as enum ('staff', 'space', 'equipment');
create type booking.pool_selection as enum ('any', 'customer_choice');
create type booking.price_type as enum ('fixed', 'from', 'free', 'on_request');
create type booking.event_status as enum ('draft', 'scheduled', 'published', 'closed', 'archived');
create type booking.slot_mode as enum ('grid', 'flexible');
create type booking.schedule_exception_kind as enum ('closed', 'open');
create type booking.capacity_period as enum ('slot', 'day', 'week', 'total');
create type booking.capacity_unit as enum ('bookings', 'people');
create type booking.approval_mode as enum ('manual', 'instant');
create type booking.question_kind as enum ('text', 'number', 'select', 'checkbox', 'date');
create type booking.booking_status as enum ('hold', 'pending', 'confirmed', 'declined', 'expired', 'cancelled', 'completed', 'no_show', 'released');
create type booking.booking_source as enum ('online', 'manual', 'walk_in', 'api');
create type booking.payment_status as enum ('unpaid', 'partially_paid', 'paid', 'refunded');
create type booking.actor_type as enum ('customer', 'staff', 'system', 'api');
create type booking.waitlist_status as enum ('waiting', 'offered', 'claimed', 'expired', 'removed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Declared immutable so it can back a check constraint. The tz database only
-- changes on server upgrades, and a zone is never removed, only aliased.
create function booking.is_valid_timezone(tz text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform now() at time zone tz;
  return true;
exception when invalid_parameter_value then
  return false;
end;
$$;

create function booking.is_active_status(s booking.booking_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select s in ('hold', 'pending', 'confirmed');
$$;

create function booking.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Business and policy
-- ---------------------------------------------------------------------------

create table booking.business (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  vertical booking.vertical not null default 'other',
  timezone text not null,
  currency char(3) not null,
  locale text not null,
  slot_interval_min integer not null default 15,
  default_policy_id uuid,
  external_ref text,
  status booking.business_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_slug_unique unique (slug),
  constraint business_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint business_timezone_valid check (booking.is_valid_timezone(timezone)),
  constraint business_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint business_slot_interval_positive check (slot_interval_min > 0)
);

create table booking.booking_policy (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  name text not null,
  approval_mode booking.approval_mode not null default 'instant',
  hold_minutes integer not null default 10,
  respond_within_hours integer,
  min_lead_minutes integer not null default 0,
  max_advance_days integer,
  cancel_cutoff_hours integer,
  reschedule_cutoff_hours integer,
  pending_counts_capacity boolean not null default true,
  reminder_offsets_min integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_policy_business_id_unique unique (business_id, id),
  constraint booking_policy_name_unique unique (business_id, name),
  constraint booking_policy_values check (
    hold_minutes > 0
    and (respond_within_hours is null or respond_within_hours > 0)
    and min_lead_minutes >= 0
    and (max_advance_days is null or max_advance_days > 0)
    and (cancel_cutoff_hours is null or cancel_cutoff_hours >= 0)
    and (reschedule_cutoff_hours is null or reschedule_cutoff_hours >= 0)
    and 0 < all (reminder_offsets_min)
  )
);

alter table booking.business
  add constraint business_default_policy_fk
  foreign key (id, default_policy_id) references booking.booking_policy (business_id, id)
  on delete set null (default_policy_id)
  deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- Venues, resources and pools
-- ---------------------------------------------------------------------------

create table booking.venue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  name text not null,
  kind booking.venue_kind not null default 'on_site',
  address jsonb,
  lat numeric(9, 6),
  lng numeric(9, 6),
  timezone text,
  instructions text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_business_id_unique unique (business_id, id),
  constraint venue_timezone_valid check (timezone is null or booking.is_valid_timezone(timezone)),
  constraint venue_coordinates check ((lat is null) = (lng is null))
);

create table booking.resource (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  venue_id uuid,
  kind booking.resource_kind not null,
  name text not null,
  capacity integer not null default 1,
  external_user_ref text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_business_id_unique unique (business_id, id),
  constraint resource_venue_fk foreign key (business_id, venue_id)
    references booking.venue (business_id, id) on delete set null (venue_id),
  constraint resource_capacity_positive check (capacity >= 1)
);

create table booking.resource_pool (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  name text not null,
  selection booking.pool_selection not null default 'any',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_pool_business_id_unique unique (business_id, id),
  constraint resource_pool_name_unique unique (business_id, name)
);

create table booking.resource_pool_member (
  business_id uuid not null references booking.business (id) on delete cascade,
  pool_id uuid not null,
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, pool_id, resource_id),
  constraint resource_pool_member_pool_fk foreign key (business_id, pool_id)
    references booking.resource_pool (business_id, id) on delete cascade,
  constraint resource_pool_member_resource_fk foreign key (business_id, resource_id)
    references booking.resource (business_id, id) on delete cascade
);

create index resource_pool_member_resource_idx on booking.resource_pool_member (business_id, resource_id);

-- ---------------------------------------------------------------------------
-- Offerings
-- ---------------------------------------------------------------------------

create table booking.offering_category (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offering_category_business_id_unique unique (business_id, id)
);

create table booking.offering (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  category_id uuid,
  name text not null,
  description text,
  duration_min integer not null,
  buffer_before_min integer not null default 0,
  buffer_after_min integer not null default 0,
  slot_interval_min integer,
  price_minor integer,
  currency char(3) not null,
  price_type booking.price_type not null default 'fixed',
  min_party integer not null default 1,
  max_party integer not null default 1,
  policy_id uuid,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offering_business_id_unique unique (business_id, id),
  constraint offering_category_fk foreign key (business_id, category_id)
    references booking.offering_category (business_id, id) on delete set null (category_id),
  constraint offering_policy_fk foreign key (business_id, policy_id)
    references booking.booking_policy (business_id, id) on delete set null (policy_id),
  constraint offering_times check (
    duration_min > 0
    and buffer_before_min >= 0
    and buffer_after_min >= 0
    and (slot_interval_min is null or slot_interval_min > 0)
  ),
  constraint offering_price check (
    case price_type
      when 'fixed' then price_minor is not null and price_minor >= 0
      when 'from' then price_minor is not null and price_minor >= 0
      when 'free' then coalesce(price_minor, 0) = 0
      else price_minor is null or price_minor >= 0
    end
  ),
  constraint offering_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint offering_party check (min_party >= 1 and max_party >= min_party)
);

-- Each row says an offering needs `quantity` resources from a pool, or one
-- specific resource, for [offset_min, offset_min + length_min) of the service.
-- A null length runs to the end of the service. Rows of the same offering with
-- the same link_key must be served by the same resource.
create table booking.offering_requirement (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  offering_id uuid not null,
  pool_id uuid,
  resource_id uuid,
  quantity integer not null default 1,
  offset_min integer not null default 0,
  length_min integer,
  link_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offering_requirement_business_id_unique unique (business_id, id),
  constraint offering_requirement_offering_fk foreign key (business_id, offering_id)
    references booking.offering (business_id, id) on delete cascade,
  constraint offering_requirement_pool_fk foreign key (business_id, pool_id)
    references booking.resource_pool (business_id, id),
  constraint offering_requirement_resource_fk foreign key (business_id, resource_id)
    references booking.resource (business_id, id),
  constraint offering_requirement_target check (num_nonnulls(pool_id, resource_id) = 1),
  constraint offering_requirement_values check (
    quantity >= 1
    and offset_min >= 0
    and (length_min is null or length_min > 0)
    and (resource_id is null or quantity = 1)
    and (link_key is null or quantity = 1)
  )
);

create index offering_requirement_offering_idx on booking.offering_requirement (business_id, offering_id);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table booking.event (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  venue_id uuid not null,
  slug text not null,
  title text not null,
  description text,
  status booking.event_status not null default 'draft',
  starts_on date not null,
  ends_on date not null,
  publish_at timestamptz,
  closes_at timestamptz,
  policy_id uuid,
  slot_mode booking.slot_mode not null default 'grid',
  slot_interval_min integer,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_business_id_unique unique (business_id, id),
  constraint event_slug_unique unique (business_id, slug),
  constraint event_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint event_venue_fk foreign key (business_id, venue_id)
    references booking.venue (business_id, id),
  constraint event_policy_fk foreign key (business_id, policy_id)
    references booking.booking_policy (business_id, id) on delete set null (policy_id),
  constraint event_dates check (ends_on >= starts_on),
  constraint event_window check (closes_at is null or publish_at is null or closes_at > publish_at),
  constraint event_slot_interval_positive check (slot_interval_min is null or slot_interval_min > 0)
);

create table booking.event_offering (
  business_id uuid not null references booking.business (id) on delete cascade,
  event_id uuid not null,
  offering_id uuid not null,
  price_minor integer,
  duration_min integer,
  policy_id uuid,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, event_id, offering_id),
  constraint event_offering_event_fk foreign key (business_id, event_id)
    references booking.event (business_id, id) on delete cascade,
  constraint event_offering_offering_fk foreign key (business_id, offering_id)
    references booking.offering (business_id, id) on delete cascade,
  constraint event_offering_policy_fk foreign key (business_id, policy_id)
    references booking.booking_policy (business_id, id) on delete set null (policy_id),
  constraint event_offering_values check (
    (price_minor is null or price_minor >= 0)
    and (duration_min is null or duration_min > 0)
  )
);

create index event_offering_offering_idx on booking.event_offering (business_id, offering_id);

-- ---------------------------------------------------------------------------
-- Schedules, time off and capacity
-- ---------------------------------------------------------------------------

-- Weekly hours for exactly one owner: a venue, a resource or an event.
create table booking.schedule (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  venue_id uuid,
  resource_id uuid,
  event_id uuid,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_business_id_unique unique (business_id, id),
  constraint schedule_venue_fk foreign key (business_id, venue_id)
    references booking.venue (business_id, id) on delete cascade,
  constraint schedule_resource_fk foreign key (business_id, resource_id)
    references booking.resource (business_id, id) on delete cascade,
  constraint schedule_event_fk foreign key (business_id, event_id)
    references booking.event (business_id, id) on delete cascade,
  constraint schedule_owner check (num_nonnulls(venue_id, resource_id, event_id) = 1),
  constraint schedule_validity check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

-- weekday follows Postgres extract(dow) and JS getUTCDay: 0 is Sunday.
create table booking.schedule_rule (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  schedule_id uuid not null,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_rule_business_id_unique unique (business_id, id),
  constraint schedule_rule_schedule_fk foreign key (business_id, schedule_id)
    references booking.schedule (business_id, id) on delete cascade,
  constraint schedule_rule_weekday check (weekday between 0 and 6),
  constraint schedule_rule_times check (end_time > start_time)
);

-- closed without times closes the whole day; closed with times removes that
-- range; open adds a range (an extra day or longer hours).
create table booking.schedule_exception (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  schedule_id uuid not null,
  date date not null,
  kind booking.schedule_exception_kind not null,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_exception_business_id_unique unique (business_id, id),
  constraint schedule_exception_schedule_fk foreign key (business_id, schedule_id)
    references booking.schedule (business_id, id) on delete cascade,
  constraint schedule_exception_times check (
    (start_time is null) = (end_time is null)
    and (end_time is null or end_time > start_time)
    and (kind = 'closed' or start_time is not null)
  )
);

-- No scope column set means the whole business is blocked.
create table booking.time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  venue_id uuid,
  resource_id uuid,
  event_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_off_business_id_unique unique (business_id, id),
  constraint time_off_venue_fk foreign key (business_id, venue_id)
    references booking.venue (business_id, id) on delete cascade,
  constraint time_off_resource_fk foreign key (business_id, resource_id)
    references booking.resource (business_id, id) on delete cascade,
  constraint time_off_event_fk foreign key (business_id, event_id)
    references booking.event (business_id, id) on delete cascade,
  constraint time_off_scope check (num_nonnulls(venue_id, resource_id, event_id) <= 1),
  constraint time_off_range check (ends_at > starts_at)
);

create index time_off_range_idx on booking.time_off (business_id, starts_at);

create table booking.capacity_rule (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  event_id uuid,
  offering_id uuid,
  resource_id uuid,
  venue_id uuid,
  period booking.capacity_period not null,
  unit booking.capacity_unit not null default 'bookings',
  max_count integer not null,
  per_customer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capacity_rule_business_id_unique unique (business_id, id),
  constraint capacity_rule_event_fk foreign key (business_id, event_id)
    references booking.event (business_id, id) on delete cascade,
  constraint capacity_rule_offering_fk foreign key (business_id, offering_id)
    references booking.offering (business_id, id) on delete cascade,
  constraint capacity_rule_resource_fk foreign key (business_id, resource_id)
    references booking.resource (business_id, id) on delete cascade,
  constraint capacity_rule_venue_fk foreign key (business_id, venue_id)
    references booking.venue (business_id, id) on delete cascade,
  constraint capacity_rule_scope check (num_nonnulls(event_id, offering_id, resource_id, venue_id) = 1),
  constraint capacity_rule_max_positive check (max_count > 0)
);

-- ---------------------------------------------------------------------------
-- Customers and questions
-- ---------------------------------------------------------------------------

create table booking.customer (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  name text not null,
  email text,
  phone_e164 text,
  locale text,
  marketing_opt_in_at timestamptz,
  notes text,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_business_id_unique unique (business_id, id),
  constraint customer_email_unique unique (business_id, email),
  constraint customer_email_normalized check (email is null or (email = lower(btrim(email)) and email like '%_@_%')),
  constraint customer_phone_e164 check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);

create index customer_phone_idx on booking.customer (business_id, phone_e164);

-- No scope column set means the question applies to every booking.
create table booking.question (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  event_id uuid,
  offering_id uuid,
  label text not null,
  kind booking.question_kind not null,
  options jsonb not null default '[]',
  required boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_business_id_unique unique (business_id, id),
  constraint question_event_fk foreign key (business_id, event_id)
    references booking.event (business_id, id) on delete cascade,
  constraint question_offering_fk foreign key (business_id, offering_id)
    references booking.offering (business_id, id) on delete cascade,
  constraint question_scope check (num_nonnulls(event_id, offering_id) <= 1),
  constraint question_options_array check (jsonb_typeof(options) = 'array')
);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

create table booking.booking (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  reference text not null,
  customer_id uuid not null,
  event_id uuid,
  venue_id uuid not null,
  status booking.booking_status not null,
  source booking.booking_source not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  party_size integer not null default 1,
  total_minor integer not null default 0,
  currency char(3) not null,
  payment_status booking.payment_status,
  customer_notes text,
  internal_notes text,
  hold_expires_at timestamptz,
  respond_by timestamptz,
  idempotency_key text,
  manage_token_hash text,
  cancel_reason text,
  created_by_ref text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_business_id_unique unique (business_id, id),
  constraint booking_reference_unique unique (business_id, reference),
  constraint booking_idempotency_key_unique unique (business_id, idempotency_key),
  constraint booking_customer_fk foreign key (business_id, customer_id)
    references booking.customer (business_id, id),
  constraint booking_event_id_fk foreign key (business_id, event_id)
    references booking.event (business_id, id),
  constraint booking_venue_fk foreign key (business_id, venue_id)
    references booking.venue (business_id, id),
  constraint booking_range check (ends_at > starts_at),
  constraint booking_values check (party_size >= 1 and total_minor >= 0),
  constraint booking_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint booking_hold_expiry check (status <> 'hold' or hold_expires_at is not null),
  constraint booking_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index booking_status_starts_idx on booking.booking (business_id, status, starts_at);
create index booking_event_starts_idx on booking.booking (business_id, event_id, starts_at);
create index booking_customer_idx on booking.booking (business_id, customer_id);

-- price_minor and currency are a snapshot taken when the booking is made.
create table booking.booking_item (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  booking_id uuid not null,
  offering_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_minor integer,
  currency char(3) not null,
  party_size integer not null default 1,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_item_business_id_unique unique (business_id, id),
  constraint booking_item_booking_unique unique (business_id, booking_id, id),
  constraint booking_item_booking_fk foreign key (business_id, booking_id)
    references booking.booking (business_id, id) on delete cascade,
  constraint booking_item_offering_fk foreign key (business_id, offering_id)
    references booking.offering (business_id, id),
  constraint booking_item_range check (ends_at > starts_at),
  constraint booking_item_values check ((price_minor is null or price_minor >= 0) and party_size >= 1),
  constraint booking_item_currency_format check (currency ~ '^[A-Z]{3}$')
);

-- One row per resource unit an item holds, buffers included. A resource with
-- capacity n has units 0..n-1, and the exclusion constraint guarantees no two
-- active allocations overlap on the same unit. This is the last line of
-- defence against overbooking; the write function checks first.
create table booking.booking_allocation (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  booking_id uuid not null,
  booking_item_id uuid not null,
  resource_id uuid not null,
  unit smallint not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_allocation_business_id_unique unique (business_id, id),
  constraint booking_allocation_booking_fk foreign key (business_id, booking_id)
    references booking.booking (business_id, id) on delete cascade,
  constraint booking_allocation_item_fk foreign key (business_id, booking_id, booking_item_id)
    references booking.booking_item (business_id, booking_id, id) on delete cascade,
  constraint booking_allocation_resource_fk foreign key (business_id, resource_id)
    references booking.resource (business_id, id),
  constraint booking_allocation_range check (ends_at > starts_at),
  constraint booking_allocation_unit check (unit >= 0),
  constraint booking_allocation_no_overlap exclude using gist (
    resource_id with =,
    unit with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (active)
);

create index booking_allocation_booking_idx on booking.booking_allocation (business_id, booking_id);
create index booking_allocation_resource_idx on booking.booking_allocation (business_id, resource_id, starts_at) where active;

create table booking.booking_answer (
  business_id uuid not null references booking.business (id) on delete cascade,
  booking_id uuid not null,
  question_id uuid not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, booking_id, question_id),
  constraint booking_answer_booking_fk foreign key (business_id, booking_id)
    references booking.booking (business_id, id) on delete cascade,
  constraint booking_answer_question_fk foreign key (business_id, question_id)
    references booking.question (business_id, id)
);

-- Append-only log of what happened to a booking and who did it.
create table booking.booking_event (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  booking_id uuid not null,
  type text not null,
  from_status booking.booking_status,
  to_status booking.booking_status,
  actor_type booking.actor_type not null,
  actor_ref text,
  data jsonb not null default '{}',
  at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_event_business_id_unique unique (business_id, id),
  constraint booking_event_booking_fk foreign key (business_id, booking_id)
    references booking.booking (business_id, id) on delete cascade
);

create index booking_event_booking_idx on booking.booking_event (business_id, booking_id, at);

create table booking.waitlist_entry (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  customer_id uuid not null,
  event_id uuid,
  offering_id uuid,
  resource_id uuid,
  preferred jsonb not null default '{}',
  status booking.waitlist_status not null default 'waiting',
  offer_expires_at timestamptz,
  claim_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_entry_business_id_unique unique (business_id, id),
  constraint waitlist_entry_customer_fk foreign key (business_id, customer_id)
    references booking.customer (business_id, id) on delete cascade,
  constraint waitlist_entry_event_fk foreign key (business_id, event_id)
    references booking.event (business_id, id) on delete cascade,
  constraint waitlist_entry_offering_fk foreign key (business_id, offering_id)
    references booking.offering (business_id, id) on delete cascade,
  constraint waitlist_entry_resource_fk foreign key (business_id, resource_id)
    references booking.resource (business_id, id) on delete cascade,
  constraint waitlist_entry_offer check (status <> 'offered' or offer_expires_at is not null)
);

-- ---------------------------------------------------------------------------
-- Integration: API clients, webhooks and the outbox
-- ---------------------------------------------------------------------------

-- A null business_id is a platform client that may act for any business.
create table booking.api_client (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references booking.business (id) on delete cascade,
  name text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_client_key_hash_unique unique (key_hash)
);

create index api_client_business_idx on booking.api_client (business_id);

-- A null business_id receives events for every business the client can see.
create table booking.webhook_endpoint (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references booking.business (id) on delete cascade,
  api_client_id uuid not null references booking.api_client (id) on delete cascade,
  url text not null,
  secret text not null,
  event_types text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_endpoint_url check (url ~ '^https?://')
);

create index webhook_endpoint_business_idx on booking.webhook_endpoint (business_id, api_client_id);

create table booking.outbox_event (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references booking.business (id) on delete cascade,
  type text not null,
  payload jsonb not null,
  delivered_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbox_event_attempts check (attempts >= 0)
);

create index outbox_event_business_idx on booking.outbox_event (business_id, created_at);
create index outbox_event_undelivered_idx on booking.outbox_event (created_at) where delivered_at is null;

-- ---------------------------------------------------------------------------
-- Invariants kept by triggers
-- ---------------------------------------------------------------------------

create function booking.check_allocation_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  resource_capacity integer;
begin
  select capacity into resource_capacity
  from booking.resource
  where business_id = new.business_id and id = new.resource_id;

  if new.unit >= resource_capacity then
    raise exception 'allocation unit % is outside resource capacity %', new.unit, resource_capacity
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger booking_allocation_check_unit
  before insert or update of unit, resource_id on booking.booking_allocation
  for each row execute function booking.check_allocation_unit();

-- Allocations only reserve time while their booking is hold, pending or
-- confirmed.
create function booking.release_inactive_allocations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if booking.is_active_status(old.status) and not booking.is_active_status(new.status) then
    update booking.booking_allocation
    set active = false
    where business_id = new.business_id and booking_id = new.id and active;
  end if;
  return new;
end;
$$;

create trigger booking_release_inactive_allocations
  after update of status on booking.booking
  for each row execute function booking.release_inactive_allocations();

-- ---------------------------------------------------------------------------
-- Policy resolution: event-offering, then event, then offering, then the
-- business default.
-- ---------------------------------------------------------------------------

create function booking.resolve_policy(p_business_id uuid, p_offering_id uuid, p_event_id uuid default null)
returns setof booking.booking_policy
language sql
stable
set search_path = ''
as $$
  select p.*
  from booking.business b
  join booking.offering o on o.business_id = b.id and o.id = p_offering_id
  left join booking.event e on e.business_id = b.id and e.id = p_event_id
  left join booking.event_offering eo
    on eo.business_id = b.id and eo.event_id = e.id and eo.offering_id = o.id
  join booking.booking_policy p
    on p.business_id = b.id
    and p.id = coalesce(eo.policy_id, e.policy_id, o.policy_id, b.default_policy_id)
  where b.id = p_business_id;
$$;

-- ---------------------------------------------------------------------------
-- updated_at, RLS and grants
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'booking'
  loop
    execute format(
      'create trigger %I before update on booking.%I for each row execute function booking.set_updated_at()',
      t || '_set_updated_at', t
    );
    execute format('alter table booking.%I enable row level security', t);
    execute format('alter table booking.%I force row level security', t);
  end loop;
end;
$$;

revoke all on schema booking from public, anon, authenticated;
revoke all on all tables in schema booking from public, anon, authenticated;
revoke all on all routines in schema booking from public, anon, authenticated;
revoke all on all sequences in schema booking from public, anon, authenticated;

grant usage on schema booking to service_role;
grant all on all tables in schema booking to service_role;
grant all on all routines in schema booking to service_role;
grant all on all sequences in schema booking to service_role;

alter default privileges in schema booking revoke all on tables from public, anon, authenticated;
alter default privileges in schema booking revoke all on routines from public, anon, authenticated;
alter default privileges in schema booking revoke all on sequences from public, anon, authenticated;
alter default privileges in schema booking grant all on tables to service_role;
alter default privileges in schema booking grant all on routines to service_role;
alter default privileges in schema booking grant all on sequences to service_role;
