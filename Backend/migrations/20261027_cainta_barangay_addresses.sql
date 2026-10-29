begin;

select id, area
from public.addresses
where lower(btrim(area)) in (
  'junction',
  'brookside',
  'san isidro',
  'karangalan',
  'sto. domingo'
)
order by area, id;

alter table public.addresses
  drop constraint if exists addresses_area_check;

update public.addresses
set area = case lower(btrim(area))
  when 'junction' then 'San Andres'
  when 'brookside' then 'San Roque'
  else area
end
where lower(btrim(area)) in ('junction', 'brookside');

do $$
begin
  if exists (
    select 1
    from public.addresses
    where area is not null
      and area not in (
        'San Andres',
        'San Isidro',
        'San Juan',
        'San Roque',
        'Santa Rosa',
        'Santo Domingo',
        'Santo Niño'
      )
  ) then
    raise exception 'Unmapped addresses.area values remain. Review the legacy-area report and map them before applying this constraint.';
  end if;
end
$$;

alter table public.addresses
  add constraint addresses_area_check
  check (
    area is null or area in (
      'San Andres',
      'San Isidro',
      'San Juan',
      'San Roque',
      'Santa Rosa',
      'Santo Domingo',
      'Santo Niño'
    )
  );

commit;
