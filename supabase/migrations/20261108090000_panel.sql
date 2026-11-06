create function public.reporte_ventas(p_desde date, p_hasta date)
returns table (fecha date, empleado_id uuid, empleado_nombre text, medio public.medio_pago, ventas bigint, total_gs bigint, recibido_brl numeric, equivalente_gs bigint, anuladas bigint, anuladas_gs bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then raise exception 'NO_AUTORIZADO'; end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 366 then raise exception 'VALOR_INVALIDO'; end if;
  return query select public.fecha_py(t.abierto_at), v.empleado_id, e.nombre, p.medio,
 count(*) filter (where v.estado = 'confirmada'), coalesce(sum(v.total_gs) filter (where v.estado = 'confirmada'), 0)::bigint,
 coalesce(sum(p.monto_recibido) filter (where v.estado = 'confirmada' and p.medio = 'efectivo_brl'), 0),
 coalesce(sum(p.equivalente_gs) filter (where v.estado = 'confirmada'), 0)::bigint,
 count(*) filter (where v.estado = 'anulada'), coalesce(sum(v.total_gs) filter (where v.estado = 'anulada'), 0)::bigint
 from public.ventas v join public.turnos t on t.id = v.turno_id join public.perfiles e on e.id = v.empleado_id join public.pagos p on p.venta_id = v.id
 where public.fecha_py(t.abierto_at) between p_desde and p_hasta group by 1, 2, 3, 4;
end
$$;
revoke all on function public.reporte_ventas(date, date) from public, anon;
grant execute on function public.reporte_ventas(date, date) to authenticated, service_role;

create function public.reporte_mas_vendidos(p_desde date, p_hasta date)
returns table (producto_id uuid, nombre text, cantidad bigint, total_gs bigint, ganancia_gs bigint, unidades_sin_costo bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then raise exception 'NO_AUTORIZADO'; end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 366 then raise exception 'VALOR_INVALIDO'; end if;
  return query select i.producto_id, p.nombre, sum(i.cantidad)::bigint, sum(i.cantidad::bigint * i.precio_unitario_gs)::bigint,
 sum(i.cantidad::bigint * (i.precio_unitario_gs - i.costo_unitario_gs))::bigint,
 coalesce(sum(i.cantidad) filter (where i.costo_unitario_gs is null), 0)::bigint
 from public.venta_items i join public.productos p on p.id = i.producto_id join public.ventas v on v.id = i.venta_id join public.turnos t on t.id = v.turno_id
 where v.estado = 'confirmada' and public.fecha_py(t.abierto_at) between p_desde and p_hasta group by i.producto_id, p.nombre order by 3 desc, 4 desc;
end
$$;
revoke all on function public.reporte_mas_vendidos(date, date) from public, anon;
grant execute on function public.reporte_mas_vendidos(date, date) to authenticated, service_role;

create function public.reporte_cierres(p_desde date, p_hasta date)
returns table (turno_id uuid, fecha date, empleado_id uuid, empleado_nombre text, abierto_at timestamptz, cerrado_at timestamptz, cerrado_por_id uuid, cerrado_por_nombre text, contado_anterior_gs int, contado_anterior_brl numeric, corregido boolean, esperado_gs bigint, esperado_brl numeric, contado_gs bigint, contado_brl numeric, diferencia_gs bigint, diferencia_brl numeric, transferencias_gs bigint, tarjetas_gs bigint, fondo_gs bigint, fondo_brl numeric, ventas_efectivo_gs bigint, ventas_efectivo_brl numeric, entradas_gs bigint, entradas_brl numeric, salidas_gs bigint, salidas_brl numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then raise exception 'NO_AUTORIZADO'; end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 366 then raise exception 'VALOR_INVALIDO'; end if;
  return query select t.id, public.fecha_py(t.abierto_at), t.empleado_id, e.nombre, t.abierto_at, t.cerrado_at, t.cerrado_por, c.nombre, anterior.contado_gs, anterior.contado_brl,
 exists(select 1 from public.correcciones_conteo cc where cc.turno_id = t.id), r.*
 from public.turnos t join public.perfiles e on e.id = t.empleado_id left join public.perfiles c on c.id = t.cerrado_por
 left join lateral (select a.contado_gs, a.contado_brl from public.turnos a where a.cerrado_at is not null and a.abierto_at < t.abierto_at order by a.abierto_at desc limit 1) anterior on true
 cross join lateral public._resumen_turno(t.id) r
 where public.fecha_py(t.abierto_at) between p_desde and p_hasta order by t.abierto_at desc;
end
$$;
revoke all on function public.reporte_cierres(date, date) from public, anon;
grant execute on function public.reporte_cierres(date, date) to authenticated, service_role;

create function public.reporte_anulaciones(p_desde date, p_hasta date)
returns table (venta_id uuid, fecha date, vendida_at timestamptz, anulada_at timestamptz, total_gs int, medio public.medio_pago, empleado_nombre text, anulada_por_nombre text, motivo text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then raise exception 'NO_AUTORIZADO'; end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 366 then raise exception 'VALOR_INVALIDO'; end if;
  return query select v.id, public.fecha_py(t.abierto_at), v.created_at, v.anulada_at, v.total_gs, p.medio, e.nombre, a.nombre, v.anulada_motivo
 from public.ventas v join public.turnos t on t.id = v.turno_id join public.pagos p on p.venta_id = v.id join public.perfiles e on e.id = v.empleado_id left join public.perfiles a on a.id = v.anulada_por
 where v.estado = 'anulada' and public.fecha_py(t.abierto_at) between p_desde and p_hasta order by v.anulada_at desc;
end
$$;
revoke all on function public.reporte_anulaciones(date, date) from public, anon;
grant execute on function public.reporte_anulaciones(date, date) to authenticated, service_role;

create function public.reporte_movimientos_caja(p_desde date, p_hasta date)
returns table (id uuid, fecha date, created_at timestamptz, sentido public.sentido_caja, tipo public.tipo_mov_caja, moneda public.moneda, monto numeric, motivo text, usuario_nombre text, turno_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_dueno() then raise exception 'NO_AUTORIZADO'; end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 366 then raise exception 'VALOR_INVALIDO'; end if;
  return query select m.id, public.fecha_py(t.abierto_at), m.created_at, m.sentido, m.tipo, m.moneda, m.monto, m.motivo, u.nombre, m.turno_id
 from public.movimientos_caja m join public.turnos t on t.id = m.turno_id join public.perfiles u on u.id = m.usuario_id
 where public.fecha_py(t.abierto_at) between p_desde and p_hasta order by m.created_at desc;
end
$$;
revoke all on function public.reporte_movimientos_caja(date, date) from public, anon;
grant execute on function public.reporte_movimientos_caja(date, date) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes', 'imagenes', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "imagenes dueno select" on storage.objects for select to authenticated
using (bucket_id = 'imagenes' and public.es_dueno());
create policy "imagenes dueno insert" on storage.objects for insert to authenticated
with check (bucket_id = 'imagenes' and public.es_dueno());
create policy "imagenes dueno update" on storage.objects for update to authenticated
using (bucket_id = 'imagenes' and public.es_dueno()) with check (bucket_id = 'imagenes' and public.es_dueno());
create policy "imagenes dueno delete" on storage.objects for delete to authenticated
using (bucket_id = 'imagenes' and public.es_dueno());
