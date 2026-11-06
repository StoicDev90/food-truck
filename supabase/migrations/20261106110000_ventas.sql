-- Ventas, cobro y anulación (spec §10.4). Todo atómico en una sola función.

create function public.registrar_venta(
  p_clave uuid, p_items jsonb, p_medio public.medio_pago, p_monto_recibido numeric default null
) returns table(venta_id uuid, total_gs int, cotizacion numeric, equivalente_gs int, vuelto_gs int)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  t public.turnos%rowtype;
  e jsonb;
  v_cant numeric;
  v_ids uuid[];
  v_qtys int[];
  v_venta uuid;
  v_total bigint := 0;
  v_cot numeric := null;
  v_equiv bigint;
  v_vuelto int := 0;
  v_recibido numeric;
  v_moneda public.moneda := 'PYG';
  r record;
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  -- for share: espera a un cierre concurrente y, tras reevaluar, ya no ve turno abierto
  select * into t from public.turnos where cerrado_at is null for share;
  if not found then
    raise exception 'SIN_TURNO_ABIERTO';
  end if;
  if t.empleado_id <> auth.uid() and not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_clave is null or p_medio is null then
    raise exception 'VALOR_INVALIDO';
  end if;

  -- repetición secuencial: devolver la venta existente sin efectos
  return query
    select v.id, v.total_gs, pg.cotizacion, pg.equivalente_gs, pg.vuelto_gs
    from public.ventas v join public.pagos pg on pg.venta_id = v.id
    where v.clave_idempotencia = p_clave;
  if found then
    return;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'VALOR_INVALIDO';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'VENTA_VACIA';
  end if;
  for e in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(e) <> 'object' then
      raise exception 'VALOR_INVALIDO';
    end if;
    if jsonb_typeof(e -> 'cantidad') is distinct from 'number' then
      raise exception 'CANTIDAD_INVALIDA';
    end if;
    v_cant := (e ->> 'cantidad')::numeric;
    if v_cant <> trunc(v_cant) or v_cant <= 0 or v_cant > 1000000 then
      raise exception 'CANTIDAD_INVALIDA';
    end if;
    if jsonb_typeof(e -> 'producto_id') is distinct from 'string'
       or (e ->> 'producto_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'VALOR_INVALIDO';
    end if;
  end loop;
  -- agrupar por producto sumando cantidades
  select array_agg(x.pid order by x.pid), array_agg(x.q::int order by x.pid)
    into v_ids, v_qtys
  from (
    select (i ->> 'producto_id')::uuid as pid, sum((i ->> 'cantidad')::numeric) as q
    from jsonb_array_elements(p_items) i group by 1
  ) x;
  if exists (select 1 from unnest(v_qtys) q where q > 1000000) then
    raise exception 'CANTIDAD_INVALIDA';
  end if;
  if (select count(*) from public.productos where id = any(v_ids)) <> cardinality(v_ids) then
    raise exception 'VALOR_INVALIDO';
  end if;

  -- insertar la venta ANTES de bloquear productos: dos llamadas con la misma clave se
  -- serializan en el índice único y la perdedora devuelve la venta existente
  begin
    insert into public.ventas (turno_id, empleado_id, total_gs, clave_idempotencia)
    values (t.id, auth.uid(), 0, p_clave)
    returning id into v_venta;
  exception when unique_violation then
    return query
      select v.id, v.total_gs, pg.cotizacion, pg.equivalente_gs, pg.vuelto_gs
      from public.ventas v join public.pagos pg on pg.venta_id = v.id
      where v.clave_idempotencia = p_clave;
    return;
  end;

  -- bloqueo de productos ordenado por id (sin deadlocks)
  for r in
    select p.id, p.activo, p.stock, p.controla_stock, p.precio_gs, p.costo_gs, a.q
    from unnest(v_ids, v_qtys) as a(pid, q)
    join public.productos p on p.id = a.pid
    order by p.id
    for update of p
  loop
    if not r.activo then
      raise exception 'PRODUCTO_INACTIVO';
    end if;
    if r.controla_stock and r.stock < r.q then
      raise exception 'STOCK_INSUFICIENTE';
    end if;
    v_total := v_total + r.precio_gs::bigint * r.q;
    insert into public.venta_items (venta_id, producto_id, cantidad, precio_unitario_gs, costo_unitario_gs)
    values (v_venta, r.id, r.q, r.precio_gs, r.costo_gs);
    if r.controla_stock then
      perform public._aplicar_mov_stock(r.id, 'venta', -r.q, null, v_venta);
    end if;
  end loop;
  if v_total > 2000000000 then
    raise exception 'VALOR_INVALIDO';
  end if;

  -- cobro
  if p_medio in ('transferencia', 'tarjeta') then
    v_recibido := v_total;
    v_equiv := v_total;
  elsif p_medio = 'efectivo_gs' then
    if p_monto_recibido is null or p_monto_recibido <> trunc(p_monto_recibido)
       or p_monto_recibido < 0 or p_monto_recibido > 2000000000 then
      raise exception 'VALOR_INVALIDO';
    end if;
    if p_monto_recibido < v_total then
      raise exception 'MONTO_INSUFICIENTE';
    end if;
    v_recibido := p_monto_recibido;
    v_equiv := p_monto_recibido;
  else
    if p_monto_recibido is null or p_monto_recibido < 0 or p_monto_recibido > 10000000 then
      raise exception 'VALOR_INVALIDO';
    end if;
    v_cot := public.cotizacion_vigente();
    if v_cot is null then
      raise exception 'SIN_COTIZACION';
    end if;
    if p_monto_recibido <> round(p_monto_recibido, 2) then
      raise exception 'VALOR_INVALIDO';
    end if;
    v_moneda := 'BRL';
    v_recibido := p_monto_recibido;
    v_equiv := round(p_monto_recibido * v_cot);
    if v_equiv < v_total then
      raise exception 'MONTO_INSUFICIENTE';
    end if;
  end if;
  if p_medio in ('efectivo_gs', 'efectivo_brl') then
    v_vuelto := (round((v_equiv - v_total) / 100.0) * 100)::int;
  end if;

  update public.ventas set total_gs = v_total where id = v_venta;
  insert into public.pagos (venta_id, medio, moneda, monto_recibido, cotizacion, equivalente_gs, vuelto_gs)
  values (v_venta, p_medio, v_moneda, v_recibido, v_cot, v_equiv, v_vuelto);

  return query select v_venta, v_total::int, v_cot, v_equiv::int, v_vuelto;
end
$$;

create function public.anular_venta(p_venta_id uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.turnos%rowtype;
  v public.ventas%rowtype;
  r record;
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  select * into t from public.turnos where cerrado_at is null for share;
  if not found then
    raise exception 'VENTA_NO_ANULABLE';
  end if;
  if t.empleado_id <> auth.uid() and not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'MOTIVO_REQUERIDO';
  end if;
  select * into v from public.ventas where id = p_venta_id for update;
  if not found or v.estado <> 'confirmada' or v.turno_id <> t.id then
    raise exception 'VENTA_NO_ANULABLE';
  end if;
  update public.ventas
    set estado = 'anulada', anulada_por = auth.uid(), anulada_at = now(), anulada_motivo = p_motivo
    where id = v.id;
  -- restaurar según lo que la venta movió realmente (controla_stock pudo cambiar)
  for r in
    select ms.producto_id, (-sum(ms.cantidad))::int as q
    from public.movimientos_stock ms
    where ms.venta_id = v.id and ms.tipo = 'venta'
    group by ms.producto_id order by ms.producto_id
  loop
    perform public._aplicar_mov_stock(r.producto_id, 'anulacion', r.q, p_motivo, v.id);
  end loop;
end
$$;

create function public.ventas_del_turno()
returns table(id uuid, created_at timestamptz, total_gs int, medio public.medio_pago,
              estado public.estado_venta, empleado_nombre text)
language plpgsql security definer set search_path = ''
as $$
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  return query
    select v.id, v.created_at, v.total_gs, pg.medio, v.estado, pf.nombre
    from public.ventas v
    join public.turnos t on t.id = v.turno_id and t.cerrado_at is null
    join public.pagos pg on pg.venta_id = v.id
    join public.perfiles pf on pf.id = v.empleado_id
    order by v.created_at desc;
end
$$;

revoke execute on function
  public.registrar_venta(uuid, jsonb, public.medio_pago, numeric),
  public.anular_venta(uuid, text),
  public.ventas_del_turno()
  from public, anon;
grant execute on function
  public.registrar_venta(uuid, jsonb, public.medio_pago, numeric),
  public.anular_venta(uuid, text),
  public.ventas_del_turno()
  to authenticated, service_role;
