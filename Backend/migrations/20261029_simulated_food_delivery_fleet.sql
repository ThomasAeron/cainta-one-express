begin;

create table if not exists public.simulated_delivery_drivers (
  driver_code text primary key,
  display_name varchar(80) not null,
  vehicle_model varchar(80) not null,
  vehicle_plate varchar(20) not null unique,
  current_lat numeric(9, 6) not null,
  current_lon numeric(9, 6) not null,
  available_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint simulated_delivery_drivers_cainta_coordinates
    check (current_lat between 14.54 and 14.64 and current_lon between 121.09 and 121.15)
);

create table if not exists public.simulated_delivery_plans (
  shipment_id uuid primary key references public.shipments(id) on delete cascade,
  driver_code text not null references public.simulated_delivery_drivers(driver_code),
  restaurant_name varchar(120) not null,
  driver_origin_lat numeric(9, 6) not null,
  driver_origin_lon numeric(9, 6) not null,
  restaurant_lat numeric(9, 6) not null,
  restaurant_lon numeric(9, 6) not null,
  destination_lat numeric(9, 6) not null,
  destination_lon numeric(9, 6) not null,
  food_prep_minutes integer not null check (food_prep_minutes between 10 and 45),
  driver_depart_at timestamptz not null,
  driver_arrival_at timestamptz not null,
  food_ready_at timestamptz not null,
  pickup_eta timestamptz not null,
  delivery_eta timestamptz not null,
  status varchar(20) not null default 'queued'
    check (status in ('queued', 'assigned', 'picked_up', 'delivered', 'failed')),
  created_at timestamptz not null default now(),
  constraint simulated_delivery_plans_cainta_coordinates
    check (
      driver_origin_lat between 14.54 and 14.64 and driver_origin_lon between 121.09 and 121.15
      and restaurant_lat between 14.54 and 14.64 and restaurant_lon between 121.09 and 121.15
      and destination_lat between 14.54 and 14.64 and destination_lon between 121.09 and 121.15
    ),
  constraint simulated_delivery_plans_timeline
    check (
      driver_arrival_at >= driver_depart_at
      and food_ready_at >= created_at
      and pickup_eta >= driver_arrival_at
      and pickup_eta >= food_ready_at
      and delivery_eta > pickup_eta
    )
);

create index if not exists simulated_delivery_plans_driver_eta_idx
  on public.simulated_delivery_plans (driver_code, delivery_eta desc);

create index if not exists simulated_delivery_plans_status_eta_idx
  on public.simulated_delivery_plans (status, pickup_eta, delivery_eta);

insert into public.simulated_delivery_drivers
  (driver_code, display_name, vehicle_model, vehicle_plate, current_lat, current_lon)
values
  ('SIM-DR-001', 'Mika Santos', 'Honda Click 125i', 'DEMO-MC-001', 14.585400, 121.108100),
  ('SIM-DR-002', 'Rafael Cruz', 'Yamaha Mio Gear', 'DEMO-MC-002', 14.599200, 121.116300),
  ('SIM-DR-003', 'Jules Mendoza', 'Honda Beat', 'DEMO-MC-003', 14.574100, 121.123900),
  ('SIM-DR-004', 'Kai Reyes', 'Suzuki Burgman Street', 'DEMO-MC-004', 14.611500, 121.107200),
  ('SIM-DR-005', 'Andrea Lim', 'Honda Click 125i', 'DEMO-MC-005', 14.565200, 121.112600),
  ('SIM-DR-006', 'Noah Garcia', 'Yamaha Mio i 125', 'DEMO-MC-006', 14.592600, 121.129200),
  ('SIM-DR-007', 'Sam Flores', 'Honda Beat', 'DEMO-MC-007', 14.580300, 121.097800),
  ('SIM-DR-008', 'Toni Dela Cruz', 'Suzuki Skydrive Sport', 'DEMO-MC-008', 14.621100, 121.120500),
  ('SIM-DR-009', 'Alex Bautista', 'Yamaha Mio Gear', 'DEMO-MC-009', 14.553900, 121.126400),
  ('SIM-DR-010', 'Pat Rivera', 'Honda Click 125i', 'DEMO-MC-010', 14.606800, 121.095500),
  ('SIM-DR-011', 'Cory Villanueva', 'Yamaha Mio i 125', 'DEMO-MC-011', 14.568700, 121.137300),
  ('SIM-DR-012', 'Dani Mercado', 'Honda Beat', 'DEMO-MC-012', 14.627900, 121.101800),
  ('SIM-DR-013', 'Riley Castro', 'Suzuki Burgman Street', 'DEMO-MC-013', 14.591300, 121.101200),
  ('SIM-DR-014', 'Jamie Aquino', 'Yamaha Mio Gear', 'DEMO-MC-014', 14.560400, 121.103900),
  ('SIM-DR-015', 'Lee Navarro', 'Honda Click 125i', 'DEMO-MC-015', 14.616200, 121.134100)
on conflict (driver_code) do nothing;

commit;
