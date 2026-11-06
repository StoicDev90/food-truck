-- Movimientos de stock: el stock nunca se pisa; todo cambio es un movimiento (spec §11.2).

create function public._aplicar_mov_stock(
  p_producto_id uuid, p_tipo public.tipo_mov_stock, p_cantidad int, p_motivo text, p_venta_id uuid
) returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_stock int;
  v_nuevo int;
  v_turno uuid;
begin
  select stock into v_stock from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'VALOR_INVALIDO';
  end if;
  v_nuevo := v_stock + p_cantidad;
  if v_nuevo < 0 then
    raise exception 'STOCK_INSUFICIENTE';
  end if;
  select id into v_turno from public.turnos where cerrado_at is null;
  update public.productos set stock = v_nuevo where id = p_producto_id;
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id, venta_id, turno_id)
  values (p_producto_id, p_tipo, p_cantidad, p_motivo, auth.uid(), p_venta_id, v_turno);
  return v_nuevo;
end
$$;

create function public.registrar_ingreso_stock(p_producto_id uuid, p_cantidad int, p_motivo text default null)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  if public.rol_actual() is null then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'CANTIDAD_INVALIDA';
  end if;
  return public._aplicar_mov_stock(p_producto_id, 'ingreso', p_cantidad, p_motivo, null);
end
$$;

create function public.ajustar_stock(p_producto_id uuid, p_cantidad int, p_motivo text)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_cantidad is null or p_cantidad = 0 then
    raise exception 'CANTIDAD_INVALIDA';
  end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'MOTIVO_REQUERIDO';
  end if;
  return public._aplicar_mov_stock(p_producto_id, 'ajuste', p_cantidad, p_motivo, null);
end
$$;

revoke execute on function public._aplicar_mov_stock(uuid, public.tipo_mov_stock, int, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.registrar_ingreso_stock(uuid, int, text),
  public.ajustar_stock(uuid, int, text) from public, anon;
grant execute on function public.registrar_ingreso_stock(uuid, int, text),
  public.ajustar_stock(uuid, int, text) to authenticated, service_role;
