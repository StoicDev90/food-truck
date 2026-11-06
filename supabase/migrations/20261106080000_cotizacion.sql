-- Cotización del día (R$ -> Gs). Zona horaria del negocio: America/Asuncion.
-- Sin cotización de hoy NO se usa la del día anterior (spec §7).

create function public.fecha_py(ts timestamptz default now()) returns date
language sql stable security definer set search_path = ''
as $$
  select (ts at time zone 'America/Asuncion')::date
$$;

create function public.cotizacion_vigente() returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(c.valor_manual, c.valor_api)
  from public.cotizaciones c
  where c.fecha = public.fecha_py()
$$;

create function public.fijar_cotizacion_manual(p_valor numeric) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'VALOR_INVALIDO';
  end if;
  insert into public.cotizaciones (fecha, valor_manual, actualizado_por, updated_at)
  values (public.fecha_py(), p_valor, auth.uid(), now())
  on conflict (fecha) do update
    set valor_manual = excluded.valor_manual,
        actualizado_por = excluded.actualizado_por,
        updated_at = excluded.updated_at;
end
$$;

create function public.registrar_cotizacion_api(p_fecha date, p_valor numeric, p_fuente text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_valor is null or p_valor <= 0 then
    raise exception 'VALOR_INVALIDO';
  end if;
  insert into public.cotizaciones (fecha, valor_api, fuente, updated_at)
  values (p_fecha, p_valor, p_fuente, now())
  on conflict (fecha) do update
    set valor_api = excluded.valor_api,
        fuente = excluded.fuente,
        updated_at = excluded.updated_at;
end
$$;

revoke execute on function public.fecha_py(timestamptz), public.cotizacion_vigente(),
  public.fijar_cotizacion_manual(numeric), public.registrar_cotizacion_api(date, numeric, text)
  from public, anon;
grant execute on function public.fecha_py(timestamptz), public.cotizacion_vigente(),
  public.fijar_cotizacion_manual(numeric) to authenticated, service_role;
grant execute on function public.registrar_cotizacion_api(date, numeric, text) to service_role;
