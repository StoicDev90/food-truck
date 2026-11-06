alter type public.resumen_caja add attribute fondo_gs bigint;
alter type public.resumen_caja add attribute fondo_brl numeric(12,2);
alter type public.resumen_caja add attribute ventas_efectivo_gs bigint;
alter type public.resumen_caja add attribute ventas_efectivo_brl numeric(12,2);
alter type public.resumen_caja add attribute entradas_gs bigint;
alter type public.resumen_caja add attribute entradas_brl numeric(12,2);
alter type public.resumen_caja add attribute salidas_gs bigint;
alter type public.resumen_caja add attribute salidas_brl numeric(12,2);

create or replace function public._resumen_turno(p_turno_id uuid)
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
  r.fondo_gs := t.fondo_gs;
  r.fondo_brl := t.fondo_brl;
  r.ventas_efectivo_gs := coalesce((select sum(p.monto_recibido) from public.pagos p join public.ventas v on v.id = p.venta_id where v.turno_id = t.id and v.estado = 'confirmada' and p.medio = 'efectivo_gs'), 0)
    - coalesce((select sum(p.vuelto_gs) from public.pagos p join public.ventas v on v.id = p.venta_id where v.turno_id = t.id and v.estado = 'confirmada' and p.medio in ('efectivo_gs', 'efectivo_brl')), 0);
  r.ventas_efectivo_brl := coalesce((select sum(p.monto_recibido) from public.pagos p join public.ventas v on v.id = p.venta_id where v.turno_id = t.id and v.estado = 'confirmada' and p.medio = 'efectivo_brl'), 0);
  select coalesce(sum(m.monto) filter (where m.moneda = 'PYG' and m.sentido = 'entrada'), 0),
         coalesce(sum(m.monto) filter (where m.moneda = 'BRL' and m.sentido = 'entrada'), 0),
         coalesce(sum(m.monto) filter (where m.moneda = 'PYG' and m.sentido = 'salida'), 0),
         coalesce(sum(m.monto) filter (where m.moneda = 'BRL' and m.sentido = 'salida'), 0)
    into r.entradas_gs, r.entradas_brl, r.salidas_gs, r.salidas_brl
    from public.movimientos_caja m where m.turno_id = t.id;
  r.esperado_gs := r.fondo_gs + r.ventas_efectivo_gs + r.entradas_gs - r.salidas_gs;
  r.esperado_brl := r.fondo_brl + r.ventas_efectivo_brl + r.entradas_brl - r.salidas_brl;
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

