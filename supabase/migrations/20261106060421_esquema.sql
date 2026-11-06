-- Esquema base. RLS y funciones vienen en migraciones posteriores.

create type public.rol_usuario as enum ('dueno', 'empleado');
create type public.tipo_mov_stock as enum ('ingreso', 'venta', 'anulacion', 'ajuste');
create type public.estado_venta as enum ('confirmada', 'anulada');
create type public.medio_pago as enum ('efectivo_gs', 'efectivo_brl', 'transferencia', 'tarjeta');
create type public.moneda as enum ('PYG', 'BRL');
create type public.sentido_caja as enum ('entrada', 'salida');
create type public.tipo_mov_caja as enum ('retiro', 'pago_proveedor', 'aporte_cambio', 'cambio_moneda', 'otro');

create table public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  usuario text unique,
  rol public.rol_usuario not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias,
  nombre text not null,
  descripcion text,
  foto_path text,
  precio_gs int not null check (precio_gs >= 0),
  costo_gs int check (costo_gs >= 0),
  stock int not null default 0 check (stock >= 0),
  controla_stock boolean not null default true,
  visible boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.perfiles,
  abierto_at timestamptz not null default now(),
  cerrado_at timestamptz,
  fondo_gs int not null default 0,
  fondo_brl numeric(12,2) not null default 0,
  contado_gs int,
  contado_brl numeric(12,2),
  cerrado_por uuid references public.perfiles,
  created_at timestamptz not null default now()
);
create unique index turnos_unico_abierto on public.turnos ((true)) where cerrado_at is null;

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.turnos,
  empleado_id uuid not null references public.perfiles,
  total_gs int not null check (total_gs >= 0),
  estado public.estado_venta not null default 'confirmada',
  clave_idempotencia uuid not null unique,
  anulada_por uuid references public.perfiles,
  anulada_at timestamptz,
  anulada_motivo text,
  created_at timestamptz not null default now()
);

create table public.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas,
  producto_id uuid not null references public.productos,
  cantidad int not null check (cantidad > 0),
  precio_unitario_gs int not null check (precio_unitario_gs >= 0),
  costo_unitario_gs int check (costo_unitario_gs >= 0),
  created_at timestamptz not null default now()
);

create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos,
  tipo public.tipo_mov_stock not null,
  cantidad int not null,
  motivo text,
  usuario_id uuid not null references public.perfiles,
  venta_id uuid references public.ventas,
  turno_id uuid references public.turnos,
  created_at timestamptz not null default now()
);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null unique references public.ventas,
  medio public.medio_pago not null,
  moneda public.moneda not null,
  monto_recibido numeric(12,2) not null,
  cotizacion numeric(12,2),
  equivalente_gs int not null,
  vuelto_gs int not null default 0,
  created_at timestamptz not null default now()
);

create table public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.turnos,
  sentido public.sentido_caja not null,
  tipo public.tipo_mov_caja not null,
  moneda public.moneda not null,
  monto numeric(12,2) not null check (monto > 0),
  motivo text not null check (length(trim(motivo)) > 0),
  usuario_id uuid not null references public.perfiles,
  created_at timestamptz not null default now()
);

create table public.correcciones_conteo (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.turnos,
  dueno_id uuid not null references public.perfiles,
  contado_gs_anterior int,
  contado_brl_anterior numeric(12,2),
  contado_gs_nuevo int,
  contado_brl_nuevo numeric(12,2),
  motivo text not null,
  created_at timestamptz not null default now()
);

create table public.cotizaciones (
  fecha date primary key,
  valor_api numeric(12,2) check (valor_api > 0),
  valor_manual numeric(12,2) check (valor_manual > 0),
  fuente text,
  actualizado_por uuid references public.perfiles,
  updated_at timestamptz not null default now()
);

create table public.configuracion (
  id smallint primary key default 1 check (id = 1),
  nombre text not null default 'Food Truck',
  logo_path text,
  horarios jsonb not null default '{}',
  whatsapp text,
  instagram text,
  ubicacion text
);
insert into public.configuracion (id) values (1);
