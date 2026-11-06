-- RLS estricta y grants mínimos. Las escrituras de negocio van por funciones SECURITY DEFINER.

-- Todo lo nuevo nace cerrado para anon/authenticated (service_role conserva acceso).
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Helpers de rol
create function public.rol_actual() returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$
  select p.rol from public.perfiles p where p.id = (select auth.uid()) and p.activo
$$;

create function public.es_dueno() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.rol_actual() = 'dueno', false)
$$;

revoke execute on function public.rol_actual(), public.es_dueno() from public, anon;
grant execute on function public.rol_actual(), public.es_dueno() to authenticated, service_role;

alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.turnos enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;
alter table public.movimientos_stock enable row level security;
alter table public.pagos enable row level security;
alter table public.movimientos_caja enable row level security;
alter table public.correcciones_conteo enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.configuracion enable row level security;

-- productos: costo_gs oculto a anon (authenticated activo lo ve); stock nunca escribible directo.
grant select (id, categoria_id, nombre, descripcion, foto_path, precio_gs, stock, controla_stock, visible, activo, created_at)
  on public.productos to anon;
grant select on public.productos to authenticated;
grant insert (categoria_id, nombre, descripcion, foto_path, precio_gs, costo_gs, controla_stock, visible, activo)
  on public.productos to authenticated;
grant update (categoria_id, nombre, descripcion, foto_path, precio_gs, costo_gs, controla_stock, visible, activo)
  on public.productos to authenticated;

create policy productos_anon_select on public.productos for select to anon
  using (visible and activo);
create policy productos_select on public.productos for select to authenticated
  using (public.rol_actual() is not null);
create policy productos_insert on public.productos for insert to authenticated
  with check (public.es_dueno());
create policy productos_update on public.productos for update to authenticated
  using (public.es_dueno()) with check (public.es_dueno());

-- categorias
grant select on public.categorias to anon, authenticated;
grant insert, update, delete on public.categorias to authenticated;
create policy categorias_anon_select on public.categorias for select to anon using (true);
create policy categorias_select on public.categorias for select to authenticated
  using (public.rol_actual() is not null);
create policy categorias_insert on public.categorias for insert to authenticated
  with check (public.es_dueno());
create policy categorias_update on public.categorias for update to authenticated
  using (public.es_dueno()) with check (public.es_dueno());
create policy categorias_delete on public.categorias for delete to authenticated
  using (public.es_dueno());

-- configuracion
grant select on public.configuracion to anon, authenticated;
grant update (nombre, logo_path, horarios, whatsapp, instagram, ubicacion) on public.configuracion to authenticated;
create policy configuracion_anon_select on public.configuracion for select to anon using (true);
create policy configuracion_select on public.configuracion for select to authenticated
  using (public.rol_actual() is not null);
create policy configuracion_update on public.configuracion for update to authenticated
  using (public.es_dueno()) with check (public.es_dueno());

-- cotizaciones: lectura para usuarios activos; escritura solo por funciones
grant select on public.cotizaciones to authenticated;
create policy cotizaciones_select on public.cotizaciones for select to authenticated
  using (public.rol_actual() is not null);

-- perfiles: propia fila o dueño
grant select on public.perfiles to authenticated;
create policy perfiles_select on public.perfiles for select to authenticated
  using (public.rol_actual() is not null and (id = (select auth.uid()) or public.es_dueno()));

-- tablas de negocio: solo dueño lee; empleado ve 0 filas; sin escritura directa
grant select on public.turnos, public.ventas, public.venta_items, public.pagos,
  public.movimientos_stock, public.movimientos_caja, public.correcciones_conteo to authenticated;
create policy turnos_select on public.turnos for select to authenticated using (public.es_dueno());
create policy ventas_select on public.ventas for select to authenticated using (public.es_dueno());
create policy venta_items_select on public.venta_items for select to authenticated using (public.es_dueno());
create policy pagos_select on public.pagos for select to authenticated using (public.es_dueno());
create policy movimientos_stock_select on public.movimientos_stock for select to authenticated using (public.es_dueno());
create policy movimientos_caja_select on public.movimientos_caja for select to authenticated using (public.es_dueno());
create policy correcciones_conteo_select on public.correcciones_conteo for select to authenticated using (public.es_dueno());
