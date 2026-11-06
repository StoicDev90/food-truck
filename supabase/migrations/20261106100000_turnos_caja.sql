-- Turnos, caja y cierre a ciegas (spec §10). El empleado nunca ve el esperado salvo
-- en el retorno de cerrar_turno; las tablas no son legibles por empleados (RLS).

create type public.resumen_caja as (
  esperado_gs bigint,
  esperado_brl numeric(12,2),
  contado_gs bigint,
  contado_brl numeric(12,2),
  diferencia_gs bigint,
  diferencia_brl numeric(12,2),
  transferencias_gs bigint,
  tarjetas_gs bigint
);

-- Interna: solo ventas confirmadas.
create function public._resumen_turno(p_turno_id uuid)
returns public.resumen_caja
language plpgsql security definer set search_path = ''
as $$
declare
  t public.turnos%rowtype;
  r public.resumen_caja;
begin
  select * into t from public.turnos where id = p_turno_id;
  if not found then
    raise exception 'VALOR_INVALIDO';
  end if;
  r.esperado_gs := t.fondo_gs
    + coalesce((select sum(p.monto_recibido) from public.pagos p
        join public.ventas v on v.id = p.venta_id
        where v.turno_id = t.id and v.estado = 'confirmada' and p.medio = 'efectivo_gs'), 0)
    - coalesce((select sum(p.vuelto_gs) from public.pagos p
        join public.ventas v on v.id = p.venta_id
        where v.turno_id = t.id and v.estado = 'confirmada'
          and p.medio in ('efectivo_gs', 'efectivo_brl')), 0)
    + coalesce((select sum(case m.sentido when 'entrada' then m.monto else -m.monto end)
        from public.movimientos_caja m where m.turno_id = t.id and m.moneda = 'PYG'), 0);
  r.esperado_brl := t.fondo_brl
    + coalesce((select sum(p.monto_recibido) from public.pagos p
        join public.ventas v on v.id = p.venta_id
        where v.turno_id = t.id and v.estado = 'confirmada' and p.medio = 'efectivo_brl'), 0)
    + coalesce((select sum(case m.sentido when 'entrada' then m.monto else -m.monto end)
        from public.movimientos_caja m where m.turno_id = t.id and m.moneda = 'BRL'), 0);
  r.contado_gs := t.contado_gs;
  r.contado_brl := t.contado_brl;
  r.diferencia_gs := t.contado_gs - r.esperado_gs;
  r.diferencia_brl := t.contado_brl - r.esperado_brl;
  r.transferencias_gs := coalesce((select sum(p.equivalente_gs) from public.pagos p
      join public.ventas v on v.id = p.venta_id
      where v.turno_id = t.id and v.estado = 'confirmada' and p.medio = 'transferencia'), 0);
  r.tarjetas_gs := coalesce((select sum(p.equivalente_gs) from public.pagos p
      join public.ventas v on v.id = p.venta_id
      where v.turno_id = t.id and v.estado = 'confirmada' and p.medio = 'tarjeta'), 0);
  return r;
end
$$;

create function public.abrir_turno(p_fondo_gs int, p_fondo_brl numeric)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_fondo_gs is null or p_fondo_gs < 0 or p_fondo_brl is null or p_fondo_brl < 0
     or p_fondo_brl <> round(p_fondo_brl, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if exists (select 1 from public.turnos where cerrado_at is null) then
    raise exception 'TURNO_YA_ABIERTO';
  end if;
  begin
    insert into public.turnos (empleado_id, fondo_gs, fondo_brl)
    values (auth.uid(), p_fondo_gs, p_fondo_brl)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'TURNO_YA_ABIERTO';
  end;
  return v_id;
end
$$;

create function public.turno_actual()
returns table(id uuid, empleado_id uuid, empleado_nombre text, abierto_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  return query
    select t.id, t.empleado_id, p.nombre, t.abierto_at
    from public.turnos t join public.perfiles p on p.id = t.empleado_id
    where t.cerrado_at is null;
end
$$;

create function public.fondo_sugerido()
returns table(fondo_gs int, fondo_brl numeric)
language plpgsql security definer set search_path = ''
as $$
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  return query
    select coalesce(u.contado_gs, 0), coalesce(u.contado_brl, 0::numeric)
    from (select 1) x
    left join lateral (
      select t.contado_gs, t.contado_brl from public.turnos t
      where t.cerrado_at is not null order by t.cerrado_at desc limit 1
    ) u on true;
end
$$;

create function public.registrar_movimiento_caja(
  p_sentido public.sentido_caja, p_tipo public.tipo_mov_caja, p_moneda public.moneda,
  p_monto numeric, p_motivo text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  t public.turnos%rowtype;
  v_id uuid;
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  -- for share: espera a un cierre concurrente y, tras reevaluar (READ COMMITTED), ya no ve turno abierto
  select * into t from public.turnos where cerrado_at is null for share;
  if not found then
    raise exception 'SIN_TURNO_ABIERTO';
  end if;
  if t.empleado_id <> auth.uid() and not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'MOTIVO_REQUERIDO';
  end if;
  if p_sentido is null or p_tipo is null or p_moneda is null
     or p_monto is null or p_monto <= 0 or p_monto <> round(p_monto, 2)
     or (p_moneda = 'PYG' and p_monto <> round(p_monto)) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if (p_tipo in ('retiro', 'pago_proveedor') and p_sentido <> 'salida')
     or (p_tipo = 'aporte_cambio' and p_sentido <> 'entrada') then
    raise exception 'VALOR_INVALIDO';
  end if;
  insert into public.movimientos_caja (turno_id, sentido, tipo, moneda, monto, motivo, usuario_id)
  values (t.id, p_sentido, p_tipo, p_moneda, p_monto, p_motivo, auth.uid())
  returning id into v_id;
  return v_id;
end
$$;

create function public.cerrar_turno(p_turno_id uuid, p_contado_gs int, p_contado_brl numeric)
returns public.resumen_caja
language plpgsql security definer set search_path = ''
as $$
declare
  t public.turnos%rowtype;
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  select * into t from public.turnos where id = p_turno_id for update;
  if not found then
    raise exception 'NO_AUTORIZADO';
  end if;
  if t.empleado_id <> auth.uid() and not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  if t.cerrado_at is not null then
    raise exception 'TURNO_CERRADO';
  end if;
  if p_contado_gs is null or p_contado_gs < 0 or p_contado_brl is null or p_contado_brl < 0
     or p_contado_brl <> round(p_contado_brl, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  update public.turnos
    set contado_gs = p_contado_gs, contado_brl = p_contado_brl,
        cerrado_at = now(), cerrado_por = auth.uid()
    where id = t.id;
  return public._resumen_turno(t.id);
end
$$;

create function public.resumen_turno(p_turno_id uuid)
returns public.resumen_caja
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  return public._resumen_turno(p_turno_id);
end
$$;

create function public.corregir_conteo(
  p_turno_id uuid, p_contado_gs int, p_contado_brl numeric, p_motivo text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.turnos%rowtype;
begin
  if not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  select * into t from public.turnos where id = p_turno_id for update;
  if not found then
    raise exception 'VALOR_INVALIDO';
  end if;
  if t.cerrado_at is null then
    raise exception 'TURNO_ABIERTO';
  end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'MOTIVO_REQUERIDO';
  end if;
  if p_contado_gs is null or p_contado_gs < 0 or p_contado_brl is null or p_contado_brl < 0
     or p_contado_brl <> round(p_contado_brl, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  insert into public.correcciones_conteo (
    turno_id, dueno_id, contado_gs_anterior, contado_brl_anterior,
    contado_gs_nuevo, contado_brl_nuevo, motivo
  ) values (
    t.id, auth.uid(), t.contado_gs, t.contado_brl, p_contado_gs, p_contado_brl, p_motivo
  );
  update public.turnos set contado_gs = p_contado_gs, contado_brl = p_contado_brl where id = t.id;
end
$$;

revoke execute on function public._resumen_turno(uuid) from public, anon, authenticated;
revoke execute on function
  public.abrir_turno(int, numeric),
  public.turno_actual(),
  public.fondo_sugerido(),
  public.registrar_movimiento_caja(public.sentido_caja, public.tipo_mov_caja, public.moneda, numeric, text),
  public.cerrar_turno(uuid, int, numeric),
  public.resumen_turno(uuid),
  public.corregir_conteo(uuid, int, numeric, text)
  from public, anon;
grant execute on function
  public.abrir_turno(int, numeric),
  public.turno_actual(),
  public.fondo_sugerido(),
  public.registrar_movimiento_caja(public.sentido_caja, public.tipo_mov_caja, public.moneda, numeric, text),
  public.cerrar_turno(uuid, int, numeric),
  public.resumen_turno(uuid),
  public.corregir_conteo(uuid, int, numeric, text)
  to authenticated, service_role;
