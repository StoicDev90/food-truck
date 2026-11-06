create or replace function public.registrar_movimiento_caja(
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
  if not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  -- for share: espera a un cierre concurrente y, tras reevaluar (READ COMMITTED), ya no ve turno abierto
  select * into t from public.turnos where cerrado_at is null for share;
  if not found then
    raise exception 'SIN_TURNO_ABIERTO';
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

revoke execute on function public.registrar_movimiento_caja(public.sentido_caja, public.tipo_mov_caja, public.moneda, numeric, text)
  from public, anon;
grant execute on function public.registrar_movimiento_caja(public.sentido_caja, public.tipo_mov_caja, public.moneda, numeric, text)
  to authenticated, service_role;
