# Plan 1 — Fundación: proyecto, base de datos, reglas de negocio y login

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el proyecto Next.js andando con la base de datos completa (esquema, RLS, funciones transaccionales de stock, turnos, caja, ventas y cotización) y el login de dueños y empleados, todo cubierto por tests.

**Architecture:** Una sola app Next.js (approach A). Toda regla de negocio que escribe datos vive en funciones Postgres `SECURITY DEFINER` que validan rol y estado; las tablas tienen RLS y grants mínimos, y nadie escribe tablas de negocio directamente salvo el catálogo (dueños). Next.js solo autentica y llama a esas funciones (las pantallas llegan en los planes 2–4).

**Tech Stack:** Next.js 16.4.5 (App Router), TypeScript, Tailwind, shadcn/ui, Supabase (Postgres, Auth, CLI local con Docker), `@supabase/ssr`, Vitest + React Testing Library.

**Spec:** `docs/specs/2026-11-06-food-truck-sistema-design.md`

**Roadmap:** Plan 1 (este) → Plan 2 POS (incluye botón "Confirmar" bloqueado hasta la respuesta del servidor, spec §10.2) → Plan 3 Panel de dueños (+ cron cotización, Storage de fotos, alta de empleados) → Plan 4 Menú público. Diseño visual: aparte, con fotos de los dueños, antes del Plan 2.

## Global Constraints

- Next.js 16.4.5 (App Router, Server Actions, Server Components), Tailwind + shadcn/ui, Supabase (Postgres + Auth + RLS), Vitest + React Testing Library, Vercel.
- RLS estricta en toda tabla. Ventas, stock y precios solo se modifican desde Server Actions/endpoints protegidos.
- Tipos generados con `npx supabase gen types typescript --local > types/supabase.ts` tras cada cambio de esquema.
- TDD (Vitest), spec-first en `docs/specs/`.
- Moneda base: guaraní (₲, sin decimales, se guarda como entero). Real (R$) con 2 decimales.
- Zona horaria del negocio: `America/Asuncion` para "día", turnos, horarios y reportes.
- Un solo empleado por turno, un solo dispositivo POS.
- Toda función Postgres: `security definer`, `set search_path = ''`, nombres calificados (`public.x`), `revoke execute ... from public, anon` y `grant` explícito. Errores de negocio con `raise exception '<CODIGO>'` usando exactamente los códigos de `lib/errores.ts`.
- Los nombres de dominio (tablas, columnas, funciones) van en español sin tildes, como en la spec §12.

## Review Focus

1. **Dos ventas simultáneas por la última unidad** (doble pestaña, reintento): una sola pasa, la otra recibe `STOCK_INSUFICIENTE`, el stock nunca queda negativo. → test en Task 7.
2. **Doble toque en "Confirmar"** (misma venta enviada dos veces): se registra una sola venta y el stock baja una vez. → `clave_idempotencia`, test en Task 7.
3. **Cerca de medianoche**: el "día" de la cotización y de los turnos es el de Asunción, no UTC (02:30 UTC del 7/11 sigue siendo 6/11 en Asunción). → test en Task 4.
4. **Mismo producto repetido en el pedido o cantidades 0/negativas**: las cantidades se suman para verificar stock; 0 o negativo se rechaza. → test en Task 7.
5. **Empleado desactivado con sesión todavía válida**: cualquier función o escritura le devuelve `NO_AUTORIZADO` / no tiene efecto. → tests en Tasks 3 y 5.

---

## File Structure

```
app/
  layout.tsx, page.tsx                    # scaffold; page = placeholder (Plan 4)
  pos/login/page.tsx                      # login empleado (usuario + PIN)
  pos/(protegido)/layout.tsx, page.tsx    # guard + placeholder (Plan 2)
  admin/login/page.tsx                    # login dueño (email + contraseña)
  admin/(protegido)/layout.tsx, page.tsx  # guard + placeholder (Plan 3)
lib/
  errores.ts                              # códigos de error de negocio + mensajes
  auth/empleado.ts                        # usuario/PIN/email sintético (puro)
  auth/acceso.ts                          # resolverAcceso (puro)
  auth/sesion.ts                          # obtenerPerfil, requerirAcceso (server)
  auth/acciones.ts                        # 'use server': loginEmpleado, loginDueno, cerrarSesion
  supabase/server.ts, client.ts, admin.ts, proxy.ts
proxy.ts                                  # Next 16: refresco de sesión
supabase/config.toml
supabase/migrations/<ts>_esquema.sql, _rls.sql, _cotizacion.sql, _stock.sql, _turnos_caja.sql, _ventas.sql
scripts/crear-dueno.ts
types/supabase.ts                         # generado
tests/unit/*.test.ts(x)                   # vitest.config.ts (jsdom)
tests/db/*.test.ts, helpers.ts, env.ts, global-setup.ts   # vitest.db.config.ts (node)
.env.example
```

---

### Task 1: Scaffold + utilidades de usuario de empleado

**Files:**
- Create: scaffold de Next.js en la raíz, `vitest.config.ts`, `tests/setup.ts`, `lib/auth/empleado.ts`, `tests/unit/empleado.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces:
  - `normalizarUsuario(s: string): string` — `trim().toLowerCase()`
  - `validarUsuario(s: string): boolean` — normalizado cumple `/^[a-z0-9_]{3,20}$/`
  - `validarPin(pin: string): boolean` — `/^\d{6}$/`
  - `emailDeUsuario(usuario: string): string` — `${normalizarUsuario(usuario)}@empleados.local`
  - scripts npm: `test`, `test:db`, `typecheck`, `db:types`

- [ ] **Step 1: Scaffold.** La raíz no está vacía (README, CLAUDE.md, docs, .claude), `create-next-app` la rechaza; generar aparte y copiar:

```bash
npx create-next-app@16.4.5 .ft-scaffold --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
rsync -a --exclude .git --exclude README.md .ft-scaffold/ ./ && rm -rf .ft-scaffold
npx shadcn@latest init -d
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom vite-tsconfig-paths tsx
```

`vitest.config.ts`: plugins react + tsconfigPaths, `environment: 'jsdom'`, `include: ['tests/unit/**/*.test.{ts,tsx}']`, `setupFiles: ['tests/setup.ts']` (importa `@testing-library/jest-dom/vitest`). Scripts: `"test": "vitest run"`, `"test:db": "vitest run --config vitest.db.config.ts"`, `"typecheck": "tsc --noEmit"`, `"db:types": "supabase gen types typescript --local > types/supabase.ts"`. Agregar `.ft-scaffold/` y `.env*.local` a `.gitignore` si no están.

- [ ] **Step 2: Write the failing test** `tests/unit/empleado.test.ts`

```ts
expect(normalizarUsuario('  Juan ')).toBe('juan')
expect(validarUsuario('juan_2')).toBe(true)
expect(validarUsuario(' Juan ')).toBe(true)
expect(validarUsuario('ju')).toBe(false)
expect(validarUsuario('juan pérez')).toBe(false)
expect(validarPin('123456')).toBe(true)
expect(validarPin('12345')).toBe(false)
expect(validarPin('12345a')).toBe(false)
expect(emailDeUsuario(' Juan ')).toBe('juan@empleados.local')
```

- [ ] **Step 3: Run** `npm test` → FAIL (módulo inexistente).
- [ ] **Step 4: Implement** `lib/auth/empleado.ts` con las firmas de arriba.
- [ ] **Step 5: Run** `npm test && npm run typecheck && npm run build` → todo PASS.
- [ ] **Step 6: Commit** `git add -A && git commit -m "chore: scaffold Next.js 16 + Vitest; utilidades de usuario de empleado"`

---

### Task 2: Supabase local, esquema y arnés de tests de DB

**Files:**
- Create: `supabase/` (via `npx supabase init`), migración `esquema`, `types/supabase.ts`, `vitest.db.config.ts`, `tests/db/global-setup.ts`, `tests/db/env.ts`, `tests/db/helpers.ts`, `tests/db/esquema.test.ts`

**Interfaces:**
- Consumes: `emailDeUsuario` (Task 1)
- Produces (tablas, enums y helpers de test que usan todas las tasks siguientes):
  - Enums: `rol_usuario('dueno','empleado')`, `tipo_mov_stock('ingreso','venta','anulacion','ajuste')`, `estado_venta('confirmada','anulada')`, `medio_pago('efectivo_gs','efectivo_brl','transferencia','tarjeta')`, `moneda('PYG','BRL')`, `sentido_caja('entrada','salida')`, `tipo_mov_caja('retiro','pago_proveedor','aporte_cambio','cambio_moneda','otro')`
  - Tablas de spec §12, con estas precisiones:
    - `perfiles(id uuid pk references auth.users on delete cascade, nombre text not null, usuario text unique null, rol rol_usuario not null, activo bool not null default true)`
    - `productos.stock int not null default 0 check (stock >= 0)`, `precio_gs int check (>= 0)`, `costo_gs int null check (>= 0)`, `controla_stock bool not null default true`, `visible`/`activo` default true
    - `turnos(... fondo_gs int, fondo_brl numeric(12,2), contado_gs int null, contado_brl numeric(12,2) null, cerrado_por uuid null)` + `create unique index turnos_unico_abierto on public.turnos ((true)) where cerrado_at is null`
    - `ventas.clave_idempotencia uuid not null unique`
    - `pagos.monto_recibido numeric(12,2)`, `pagos.cotizacion numeric(12,2) null`
    - `movimientos_caja.monto numeric(12,2) check (> 0)`, `motivo text not null check (length(trim(motivo)) > 0)`
    - `cotizaciones(fecha date pk, valor_api numeric(12,2) null check (> 0), valor_manual numeric(12,2) null check (> 0), fuente text, actualizado_por uuid null, updated_at timestamptz default now())`
    - `configuracion(id smallint pk default 1 check (id = 1), nombre text not null default 'Food Truck', logo_path text, horarios jsonb not null default '{}', whatsapp text, instagram text, ubicacion text)` + fila inicial insertada en la migración
    - `correcciones_conteo` según spec §12
    - Todo `id` uuid `default gen_random_uuid()`, `created_at timestamptz not null default now()`
  - `tests/db/helpers.ts`:
    - `admin: SupabaseClient<Database>` (service role), `anon: SupabaseClient<Database>`
    - `crearUsuario(rol: 'dueno' | 'empleado', opts?: { activo?: boolean }): Promise<{ id: string; usuario: string; client: SupabaseClient<Database> }>` — empleado: email `emailDeUsuario(usuario)`, password `'123456'`; dueño: `${usuario}@test.local`, password `'secreto-123'`; `auth.admin.createUser({ email_confirm: true })`, inserta perfil, devuelve cliente ya logueado. `usuario` aleatorio válido.
    - `crearProducto(opts?: { precioGs?: number; costoGs?: number | null; stock?: number; controlaStock?: boolean; activo?: boolean; visible?: boolean }): Promise<string>` — inserta categoría si no hay, producto, y fija `stock` con el cliente admin (solo fixture).
    - `limpiarOperaciones(): Promise<void>` — borra en orden `correcciones_conteo, movimientos_caja, pagos, venta_items, movimientos_stock, ventas, turnos, cotizaciones`.

- [ ] **Step 1: Init local.** `npx supabase init`, `npm i -D supabase`, `npm i @supabase/supabase-js @supabase/ssr server-only`, `npx supabase start`. Verificar en `supabase/config.toml` que `[auth.email] enable_confirmations = false`.
- [ ] **Step 2: Arnés.** `vitest.db.config.ts`: `environment: 'node'`, `include: ['tests/db/**/*.test.ts']`, `globalSetup: 'tests/db/global-setup.ts'` (corre `npx supabase db reset`), `setupFiles: ['tests/db/env.ts']` (parsea `npx supabase status -o env` → `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` a `process.env`), `fileParallelism: false`, `testTimeout: 20000`. Escribir `helpers.ts`.
- [ ] **Step 3: Write the failing test** `tests/db/esquema.test.ts` (con `beforeEach(limpiarOperaciones)`)

```ts
// un solo turno abierto
const e1 = await crearUsuario('empleado'); const e2 = await crearUsuario('empleado')
await admin.from('turnos').insert({ empleado_id: e1.id, fondo_gs: 0, fondo_brl: 0 })
const { error } = await admin.from('turnos').insert({ empleado_id: e2.id, fondo_gs: 0, fondo_brl: 0 })
expect(error?.code).toBe('23505')
// configuración de fila única
expect((await admin.from('configuracion').insert({ id: 2 })).error).not.toBeNull()
expect((await admin.from('configuracion').select()).data).toHaveLength(1)
// stock no negativo
const p = await crearProducto()
expect((await admin.from('productos').update({ stock: -1 }).eq('id', p)).error).not.toBeNull()
// el email sintético de empleado sirve para loguearse con PIN
const { error: e } = await anon.auth.signInWithPassword({ email: emailDeUsuario(e1.usuario), password: '123456' })
expect(e).toBeNull()
```

- [ ] **Step 4: Run** `npm run test:db` → FAIL (tablas inexistentes).
- [ ] **Step 5: Implement** `npx supabase migration new esquema` y escribir el SQL según Interfaces.
- [ ] **Step 6: Run** `npm run test:db` → PASS. Luego `npm run db:types && npm run typecheck` → PASS.
- [ ] **Step 7: Commit** `git commit -m "feat(db): esquema base y arnés de tests de DB"`

---

### Task 3: RLS y grants

**Files:**
- Create: migración `rls`, `tests/db/rls.test.ts`

**Interfaces:**
- Produces:
  - `public.rol_actual() returns public.rol_usuario` — `stable security definer`; rol de `auth.uid()` si `activo`, si no `null`. Grant a `authenticated`.
  - `public.es_dueno() returns boolean` — `rol_actual() = 'dueno'`. Grant a `authenticated`.
  - Matriz de acceso (todas las tablas con RLS enabled):

| Tabla | anon | empleado activo | dueño activo |
|---|---|---|---|
| productos | select de todas las columnas **excepto `costo_gs`**, solo `visible and activo` | select | select; insert/update de todas las columnas **excepto `stock`** |
| categorias, configuracion | select | select | select + escritura (categorías: insert/update/delete; configuración: update) |
| cotizaciones | — | select | select |
| perfiles | — | select de su propia fila | select |
| turnos, ventas, venta_items, pagos, movimientos_stock, movimientos_caja, correcciones_conteo | — | — (ni select) | select |

  - Implementación: `revoke all on all tables in schema public from anon, authenticated;` luego grants explícitos (column-level donde la tabla lo indica) + policies que usan `es_dueno()` / `rol_actual() is not null`. `alter default privileges in schema public revoke all on tables from anon, authenticated;` y `... revoke execute on functions from public;` para que lo nuevo nazca cerrado.

- [ ] **Step 1: Write the failing test** `tests/db/rls.test.ts`

```ts
const visible = await crearProducto({ precioGs: 8000, costoGs: 5000 })
const oculto = await crearProducto({ visible: false })
// anon
const { data } = await anon.from('productos').select('id, precio_gs')
expect(data!.map(r => r.id)).toContain(visible); expect(data!.map(r => r.id)).not.toContain(oculto)
expect((await anon.from('productos').select('costo_gs')).error).not.toBeNull()
expect((await anon.from('ventas').select()).error).not.toBeNull()
// empleado no cambia precios ni ve pagos/turnos
const emp = await crearUsuario('empleado')
await emp.client.from('productos').update({ precio_gs: 1 }).eq('id', visible)
expect((await admin.from('productos').select('precio_gs').eq('id', visible).single()).data!.precio_gs).toBe(8000)
expect((await emp.client.from('pagos').select()).data).toEqual([])
expect((await emp.client.from('turnos').select()).data).toEqual([])
expect((await emp.client.from('ventas').insert({} as never)).error).not.toBeNull() // sin grant de insert
// dueño cambia precio pero no stock
const d = await crearUsuario('dueno')
expect((await d.client.from('productos').update({ precio_gs: 9000 }).eq('id', visible)).error).toBeNull()
expect((await d.client.from('productos').update({ stock: 99 }).eq('id', visible)).error).not.toBeNull()
// dueño desactivado no escribe
const dx = await crearUsuario('dueno', { activo: false })
await dx.client.from('productos').update({ precio_gs: 1 }).eq('id', visible)
expect((await admin.from('productos').select('precio_gs').eq('id', visible).single()).data!.precio_gs).toBe(9000)
```

- [ ] **Step 2: Run** `npm run test:db -- rls` → FAIL.
- [ ] **Step 3: Implement** migración `rls` según la matriz.
- [ ] **Step 4: Run** `npm run test:db` → PASS (incluida Task 2). `npm run db:types`.
- [ ] **Step 5: Commit** `git commit -m "feat(db): RLS y grants mínimos por rol"`

---

### Task 4: Códigos de error y cotización del día

**Files:**
- Create: `lib/errores.ts`, `tests/unit/errores.test.ts`, migración `cotizacion`, `tests/db/cotizacion.test.ts`

**Interfaces:**
- Produces:
  - `lib/errores.ts`: `CODIGOS_ERROR = ['NO_AUTORIZADO','VALOR_INVALIDO','MOTIVO_REQUERIDO','CANTIDAD_INVALIDA','SIN_TURNO_ABIERTO','TURNO_YA_ABIERTO','TURNO_CERRADO','TURNO_ABIERTO','STOCK_INSUFICIENTE','PRODUCTO_INACTIVO','VENTA_VACIA','SIN_COTIZACION','MONTO_INSUFICIENTE','VENTA_NO_ANULABLE'] as const`; `type CodigoError`; `MENSAJES_ERROR: Record<CodigoError, string>` (texto en español para el usuario, p. ej. `SIN_COTIZACION: 'No hay cotización del real para hoy. Un dueño debe cargarla.'`); `codigoDeError(e: { message: string } | null): CodigoError | null` (devuelve el código si `message` es uno de la lista, si no `null`).
  - SQL:
    - `public.fecha_py(ts timestamptz default now()) returns date` — `(ts at time zone 'America/Asuncion')::date`. Grant `authenticated`.
    - `public.cotizacion_vigente() returns numeric` — fila de `fecha_py()`: `coalesce(valor_manual, valor_api)`; sin fila → `null`. **Nunca** usa días anteriores. Grant `authenticated`.
    - `public.fijar_cotizacion_manual(p_valor numeric) returns void` — solo dueño (`NO_AUTORIZADO`); `p_valor <= 0` → `VALOR_INVALIDO`; upsert de hoy con `valor_manual`, `actualizado_por = auth.uid()`. Grant `authenticated`.
    - `public.registrar_cotizacion_api(p_fecha date, p_valor numeric, p_fuente text) returns void` — upsert de `valor_api`/`fuente`, no toca `valor_manual`. Grant **solo** `service_role`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/errores.test.ts`:
```ts
expect(codigoDeError({ message: 'STOCK_INSUFICIENTE' })).toBe('STOCK_INSUFICIENTE')
expect(codigoDeError({ message: 'duplicate key value' })).toBeNull()
expect(codigoDeError(null)).toBeNull()
for (const c of CODIGOS_ERROR) expect(MENSAJES_ERROR[c]).toBeTruthy()
```

`tests/db/cotizacion.test.ts`:
```ts
expect((await admin.rpc('fecha_py', { ts: '2026-11-07T02:30:00Z' })).data).toBe('2026-11-06')
const d = await crearUsuario('dueno'); const e = await crearUsuario('empleado')
expect((await e.client.rpc('cotizacion_vigente')).data).toBeNull()
const hoy = (await admin.rpc('fecha_py')).data!
const ayer = new Date(Date.parse(hoy) - 86_400_000).toISOString().slice(0, 10)
await admin.rpc('registrar_cotizacion_api', { p_fecha: ayer, p_valor: 1440, p_fuente: 'test' })
expect((await e.client.rpc('cotizacion_vigente')).data).toBeNull()          // no usa ayer
await admin.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: 1450, p_fuente: 'test' })
expect(Number((await e.client.rpc('cotizacion_vigente')).data)).toBe(1450)
expect((await d.client.rpc('fijar_cotizacion_manual', { p_valor: 1400 })).error).toBeNull()
await admin.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: 1460, p_fuente: 'test' })
expect(Number((await e.client.rpc('cotizacion_vigente')).data)).toBe(1400)  // manual gana
expect((await e.client.rpc('fijar_cotizacion_manual', { p_valor: 1 })).error?.message).toBe('NO_AUTORIZADO')
expect((await d.client.rpc('fijar_cotizacion_manual', { p_valor: 0 })).error?.message).toBe('VALOR_INVALIDO')
expect((await d.client.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: 1, p_fuente: 'x' })).error).not.toBeNull()
```

- [ ] **Step 2: Run** `npm test && npm run test:db -- cotizacion` → FAIL.
- [ ] **Step 3: Implement** `lib/errores.ts` y la migración `cotizacion`.
- [ ] **Step 4: Run** `npm test && npm run test:db` → PASS. `npm run db:types`.
- [ ] **Step 5: Commit** `git commit -m "feat(db): cotización del día y códigos de error"`

---

### Task 5: Movimientos de stock

**Files:**
- Create: migración `stock`, `tests/db/stock.test.ts`

**Interfaces:**
- Consumes: `rol_actual()`, `es_dueno()` (Task 3)
- Produces:
  - `public._aplicar_mov_stock(p_producto_id uuid, p_tipo public.tipo_mov_stock, p_cantidad int, p_motivo text, p_venta_id uuid) returns int` — interna (sin grant a nadie); inserta en `movimientos_stock` (con `usuario_id = auth.uid()`, `turno_id` = turno abierto si hay), actualiza `productos.stock`, devuelve el stock nuevo; si queda < 0 → `STOCK_INSUFICIENTE`.
  - `public.registrar_ingreso_stock(p_producto_id uuid, p_cantidad int, p_motivo text default null) returns int` — empleado o dueño activo (`NO_AUTORIZADO`); `p_cantidad <= 0` → `CANTIDAD_INVALIDA`. Grant `authenticated`.
  - `public.ajustar_stock(p_producto_id uuid, p_cantidad int, p_motivo text) returns int` — solo dueño; `p_cantidad = 0` → `CANTIDAD_INVALIDA`; motivo vacío → `MOTIVO_REQUERIDO`. Grant `authenticated`.

- [ ] **Step 1: Write the failing test** `tests/db/stock.test.ts`

```ts
const p = await crearProducto({ stock: 10 }); const e = await crearUsuario('empleado'); const d = await crearUsuario('dueno')
expect((await e.client.rpc('registrar_ingreso_stock', { p_producto_id: p, p_cantidad: 15, p_motivo: 'preparé 15' })).data).toBe(25)
const mov = (await admin.from('movimientos_stock').select().eq('producto_id', p)).data!
expect(mov).toHaveLength(1); expect(mov[0]).toMatchObject({ tipo: 'ingreso', cantidad: 15, usuario_id: e.id })
expect((await e.client.rpc('registrar_ingreso_stock', { p_producto_id: p, p_cantidad: 0 })).error?.message).toBe('CANTIDAD_INVALIDA')
expect((await e.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -3, p_motivo: 'merma' })).error?.message).toBe('NO_AUTORIZADO')
expect((await d.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -3, p_motivo: 'merma' })).data).toBe(22)
expect((await d.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -3, p_motivo: ' ' })).error?.message).toBe('MOTIVO_REQUERIDO')
expect((await d.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -23, p_motivo: 'x' })).error?.message).toBe('STOCK_INSUFICIENTE')
const ex = await crearUsuario('empleado', { activo: false })
expect((await ex.client.rpc('registrar_ingreso_stock', { p_producto_id: p, p_cantidad: 1 })).error?.message).toBe('NO_AUTORIZADO')
expect((await e.client.rpc('_aplicar_mov_stock', { /* cualquier arg */ } as never)).error).not.toBeNull()
```

- [ ] **Step 2: Run** `npm run test:db -- stock` → FAIL.
- [ ] **Step 3: Implement** migración `stock`.
- [ ] **Step 4: Run** `npm run test:db` → PASS. `npm run db:types`.
- [ ] **Step 5: Commit** `git commit -m "feat(db): ingresos y ajustes de stock con historial"`

---

### Task 6: Turnos, movimientos de caja, cierre a ciegas y corrección de conteo

**Files:**
- Create: migración `turnos_caja`, `tests/db/turnos.test.ts`

**Interfaces:**
- Consumes: `rol_actual()`, `es_dueno()`
- Produces:
  - `create type public.resumen_caja as (esperado_gs bigint, esperado_brl numeric(12,2), contado_gs bigint, contado_brl numeric(12,2), diferencia_gs bigint, diferencia_brl numeric(12,2), transferencias_gs bigint, tarjetas_gs bigint)` — diferencia = contado − esperado.
  - `public._resumen_turno(p_turno_id uuid) returns public.resumen_caja` — interna. Fórmulas de spec §10.7, **solo ventas `estado = 'confirmada'`**: esperado_gs = fondo_gs + Σ `pagos.monto_recibido` de `efectivo_gs` − Σ `vuelto_gs` de `efectivo_gs` y `efectivo_brl` + Σ entradas PYG − Σ salidas PYG; esperado_brl = fondo_brl + Σ `monto_recibido` de `efectivo_brl` + Σ entradas BRL − Σ salidas BRL; transferencias_gs/tarjetas_gs = Σ `equivalente_gs` por medio.
  - `public.abrir_turno(p_fondo_gs int, p_fondo_brl numeric) returns uuid` — usuario activo; ya hay abierto → `TURNO_YA_ABIERTO`; fondo negativo → `VALOR_INVALIDO`.
  - `public.turno_actual() returns table(id uuid, empleado_id uuid, empleado_nombre text, abierto_at timestamptz)` — 0 o 1 fila; usuario activo.
  - `public.fondo_sugerido() returns table(fondo_gs int, fondo_brl numeric)` — `contado_*` del último turno cerrado, o `(0, 0)`.
  - `public.registrar_movimiento_caja(p_sentido public.sentido_caja, p_tipo public.tipo_mov_caja, p_moneda public.moneda, p_monto numeric, p_motivo text) returns uuid` — turno abierto (`SIN_TURNO_ABIERTO`); caller titular o dueño (`NO_AUTORIZADO`); motivo (`MOTIVO_REQUERIDO`); `p_monto <= 0` o más de 2 decimales → `VALOR_INVALIDO`; `retiro`/`pago_proveedor` exigen `salida`, `aporte_cambio` exige `entrada` → si no, `VALOR_INVALIDO`.
  - `public.cerrar_turno(p_turno_id uuid, p_contado_gs int, p_contado_brl numeric) returns public.resumen_caja` — titular o dueño (`NO_AUTORIZADO`); ya cerrado → `TURNO_CERRADO`; contado negativo → `VALOR_INVALIDO`; guarda contado, `cerrado_at`, `cerrado_por = auth.uid()`; devuelve el resumen (único momento en que el empleado lo ve).
  - `public.resumen_turno(p_turno_id uuid) returns public.resumen_caja` — solo dueño.
  - `public.corregir_conteo(p_turno_id uuid, p_contado_gs int, p_contado_brl numeric, p_motivo text) returns void` — solo dueño; turno abierto → `TURNO_ABIERTO`; motivo; inserta en `correcciones_conteo` con valores anteriores y nuevos; actualiza el turno.
  - Grants a `authenticated` en todas menos `_resumen_turno`.

- [ ] **Step 1: Write the failing test** `tests/db/turnos.test.ts`

```ts
const e1 = await crearUsuario('empleado'); const e2 = await crearUsuario('empleado'); const d = await crearUsuario('dueno')
expect((await e1.client.rpc('fondo_sugerido')).data).toEqual([{ fondo_gs: 0, fondo_brl: 0 }])
expect((await e1.client.rpc('registrar_movimiento_caja', { p_sentido: 'salida', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 1, p_motivo: 'x' })).error?.message).toBe('SIN_TURNO_ABIERTO')
const t = (await e1.client.rpc('abrir_turno', { p_fondo_gs: 600000, p_fondo_brl: 0 })).data!
expect((await e2.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })).error?.message).toBe('TURNO_YA_ABIERTO')
expect((await e2.client.rpc('turno_actual')).data![0]).toMatchObject({ id: t, empleado_id: e1.id })
const mc = (args: object) => e1.client.rpc('registrar_movimiento_caja', args as never)
expect((await mc({ p_sentido: 'salida', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 530000, p_motivo: 'Retiro dueño' })).error).toBeNull()
expect((await mc({ p_sentido: 'entrada', p_tipo: 'aporte_cambio', p_moneda: 'PYG', p_monto: 50000, p_motivo: 'cambio' })).error).toBeNull()
expect((await mc({ p_sentido: 'entrada', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 1, p_motivo: 'x' })).error?.message).toBe('VALOR_INVALIDO')
expect((await mc({ p_sentido: 'salida', p_tipo: 'otro', p_moneda: 'PYG', p_monto: 1, p_motivo: '' })).error?.message).toBe('MOTIVO_REQUERIDO')
expect((await e2.client.rpc('cerrar_turno', { p_turno_id: t, p_contado_gs: 0, p_contado_brl: 0 })).error?.message).toBe('NO_AUTORIZADO')
expect((await e1.client.rpc('resumen_turno', { p_turno_id: t })).error?.message).toBe('NO_AUTORIZADO')
const r = (await e1.client.rpc('cerrar_turno', { p_turno_id: t, p_contado_gs: 115000, p_contado_brl: 0 })).data!
expect(r).toMatchObject({ esperado_gs: 120000, contado_gs: 115000, diferencia_gs: -5000, esperado_brl: 0, diferencia_brl: 0 })
expect((await e1.client.rpc('cerrar_turno', { p_turno_id: t, p_contado_gs: 1, p_contado_brl: 0 })).error?.message).toBe('TURNO_CERRADO')
expect((await e1.client.rpc('fondo_sugerido')).data).toEqual([{ fondo_gs: 115000, fondo_brl: 0 }])
// corrección
expect((await e1.client.rpc('corregir_conteo', { p_turno_id: t, p_contado_gs: 120000, p_contado_brl: 0, p_motivo: 'x' })).error?.message).toBe('NO_AUTORIZADO')
expect((await d.client.rpc('corregir_conteo', { p_turno_id: t, p_contado_gs: 120000, p_contado_brl: 0, p_motivo: 'recontado' })).error).toBeNull()
expect((await d.client.rpc('resumen_turno', { p_turno_id: t })).data).toMatchObject({ diferencia_gs: 0 })
expect((await admin.from('correcciones_conteo').select().eq('turno_id', t)).data![0]).toMatchObject({ contado_gs_anterior: 115000, contado_gs_nuevo: 120000, dueno_id: d.id })
// cierre forzado por dueño + corrección sobre turno abierto
const t2 = (await e2.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })).data!
expect((await d.client.rpc('corregir_conteo', { p_turno_id: t2, p_contado_gs: 0, p_contado_brl: 0, p_motivo: 'x' })).error?.message).toBe('TURNO_ABIERTO')
await d.client.rpc('cerrar_turno', { p_turno_id: t2, p_contado_gs: 0, p_contado_brl: 0 })
expect((await admin.from('turnos').select('cerrado_por').eq('id', t2).single()).data!.cerrado_por).toBe(d.id)
```

(Comparar `numeric` como `Number(...)` si PostgREST lo devuelve como string.)

- [ ] **Step 2: Run** `npm run test:db -- turnos` → FAIL.
- [ ] **Step 3: Implement** migración `turnos_caja`.
- [ ] **Step 4: Run** `npm run test:db` → PASS. `npm run db:types`.
- [ ] **Step 5: Commit** `git commit -m "feat(db): turnos, movimientos de caja, cierre a ciegas y corrección de conteo"`

---

### Task 7: Ventas, cobro y anulación

**Files:**
- Create: migración `ventas`, `tests/db/ventas.test.ts`

**Interfaces:**
- Consumes: `_aplicar_mov_stock` (Task 5), `cotizacion_vigente` (Task 4), `turno_actual`/`_resumen_turno` (Task 6)
- Produces:
  - `public.registrar_venta(p_clave uuid, p_items jsonb, p_medio public.medio_pago, p_monto_recibido numeric default null) returns table(venta_id uuid, total_gs int, cotizacion numeric, equivalente_gs int, vuelto_gs int)` — `p_items = [{"producto_id": uuid, "cantidad": int}]`. Orden de validación:
    1. usuario activo; turno abierto (`SIN_TURNO_ABIERTO`); caller titular o dueño (`NO_AUTORIZADO`)
    2. `p_clave` ya existe → devolver esa venta sin efectos
    3. `[]` → `VENTA_VACIA`; cantidad no entera o `<= 0` → `CANTIDAD_INVALIDA`; agrupar por producto sumando cantidades
    4. bloquear productos `for update` **ordenados por id**; inactivo → `PRODUCTO_INACTIVO`; `controla_stock` y stock < cantidad → `STOCK_INSUFICIENTE`
    5. total = Σ precio × cantidad; `venta_items` guarda `precio_unitario_gs` y `costo_unitario_gs` actuales
    6. pago: `transferencia`/`tarjeta` → PYG, recibido = equivalente = total, vuelto 0. `efectivo_gs` → recibido (entero) ≥ total, si no `MONTO_INSUFICIENTE`. `efectivo_brl` → `cotizacion_vigente()` null → `SIN_COTIZACION`; más de 2 decimales → `VALOR_INVALIDO`; equivalente = `round(monto × cotización)`; equivalente < total → `MONTO_INSUFICIENTE`. Efectivo: `vuelto_gs = round((equivalente − total) / 100.0) * 100`.
    7. movimientos de stock tipo `venta` (cantidad negativa) solo para productos con `controla_stock`
    8. `ventas.empleado_id = auth.uid()` (quien registra, aunque sea un dueño en turno ajeno)
  - `public.anular_venta(p_venta_id uuid, p_motivo text) returns void` — titular del turno o dueño (`NO_AUTORIZADO`); motivo (`MOTIVO_REQUERIDO`); venta debe ser `confirmada` y de turno **abierto**, si no `VENTA_NO_ANULABLE`; marca anulada (`anulada_por`, `anulada_at`, `anulada_motivo`) y devuelve stock con movimientos `anulacion`.
  - `public.ventas_del_turno() returns table(id uuid, created_at timestamptz, total_gs int, medio public.medio_pago, estado public.estado_venta, empleado_nombre text)` — ventas del turno abierto, más recientes primero.
  - Grants a `authenticated` en las tres.

- [ ] **Step 1: Write the failing test** `tests/db/ventas.test.ts`. Fixtures: empanada `precioGs 8000, stock 40`, cerveza `precioGs 15000, stock 24`; turno abierto por `e1` con fondo `100000/0`; `const vender = (c, items, medio, monto?) => c.rpc('registrar_venta', { p_clave: crypto.randomUUID(), p_items: items, p_medio: medio, p_monto_recibido: monto })`.

```ts
const pedido = [{ producto_id: emp, cantidad: 2 }, { producto_id: cer, cantidad: 1 }]
// básico + snapshot de precio
const v1 = (await vender(e1.client, pedido, 'transferencia')).data![0]
expect(v1).toMatchObject({ total_gs: 31000, vuelto_gs: 0 })
expect(await stock(emp)).toBe(38); expect(await stock(cer)).toBe(23)
await admin.from('productos').update({ precio_gs: 9000 }).eq('id', emp)
expect((await admin.from('venta_items').select('precio_unitario_gs').eq('venta_id', v1.venta_id).eq('producto_id', emp).single()).data!.precio_unitario_gs).toBe(8000)
await admin.from('productos').update({ precio_gs: 8000 }).eq('id', emp)
// reales
expect((await vender(e1.client, pedido, 'efectivo_brl', 50)).error?.message).toBe('SIN_COTIZACION')
expect(await stock(emp)).toBe(38)
await admin.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: 1450, p_fuente: 't' })
const v2 = (await vender(e1.client, pedido, 'efectivo_brl', 50)).data![0]
expect(v2).toMatchObject({ total_gs: 31000, equivalente_gs: 72500, vuelto_gs: 41500 }); expect(Number(v2.cotizacion)).toBe(1450)
expect((await admin.from('pagos').select('moneda, monto_recibido').eq('venta_id', v2.venta_id).single()).data).toMatchObject({ moneda: 'BRL' })
// efectivo ₲
expect((await vender(e1.client, pedido, 'efectivo_gs', 30000)).error?.message).toBe('MONTO_INSUFICIENTE')
expect((await vender(e1.client, pedido, 'efectivo_gs', 50000)).data![0].vuelto_gs).toBe(19000)
// validaciones de pedido
expect((await vender(e1.client, [], 'tarjeta')).error?.message).toBe('VENTA_VACIA')
expect((await vender(e1.client, [{ producto_id: emp, cantidad: 0 }], 'tarjeta')).error?.message).toBe('CANTIDAD_INVALIDA')
const ultimo = await crearProducto({ stock: 1 })
expect((await vender(e1.client, [{ producto_id: ultimo, cantidad: 1 }, { producto_id: ultimo, cantidad: 1 }], 'tarjeta')).error?.message).toBe('STOCK_INSUFICIENTE')
expect((await admin.from('ventas').select().eq('turno_id', turno)).data).toHaveLength(3) // nada parcial
const libre = await crearProducto({ stock: 0, controlaStock: false })
expect((await vender(e1.client, [{ producto_id: libre, cantidad: 3 }], 'tarjeta')).error).toBeNull()
const inactivo = await crearProducto({ activo: false })
expect((await vender(e1.client, [{ producto_id: inactivo, cantidad: 1 }], 'tarjeta')).error?.message).toBe('PRODUCTO_INACTIVO')
// idempotencia (Review Focus 2)
const clave = crypto.randomUUID()
const a = await e1.client.rpc('registrar_venta', { p_clave: clave, p_items: [{ producto_id: emp, cantidad: 1 }], p_medio: 'tarjeta' })
const b = await e1.client.rpc('registrar_venta', { p_clave: clave, p_items: [{ producto_id: emp, cantidad: 1 }], p_medio: 'tarjeta' })
expect(b.data![0].venta_id).toBe(a.data![0].venta_id); expect(await stock(emp)).toBe(33) // 40 −2 −2 −2 −1
// concurrencia (Review Focus 1)
const uno = await crearProducto({ stock: 1 })
const res = await Promise.all([vender(e1.client, [{ producto_id: uno, cantidad: 1 }], 'tarjeta'), vender(e1.client, [{ producto_id: uno, cantidad: 1 }], 'tarjeta')])
expect(res.filter(r => r.error === null)).toHaveLength(1)
expect(res.find(r => r.error)!.error!.message).toBe('STOCK_INSUFICIENTE'); expect(await stock(uno)).toBe(0)
// permisos
expect((await vender(e2.client, pedido, 'tarjeta')).error?.message).toBe('NO_AUTORIZADO')
const vd = (await vender(d.client, [{ producto_id: emp, cantidad: 1 }], 'tarjeta')).data![0]
expect((await admin.from('ventas').select('empleado_id').eq('id', vd.venta_id).single()).data!.empleado_id).toBe(d.id)
// anulación
expect((await e1.client.rpc('anular_venta', { p_venta_id: v1.venta_id, p_motivo: '' })).error?.message).toBe('MOTIVO_REQUERIDO')
expect((await e1.client.rpc('anular_venta', { p_venta_id: v1.venta_id, p_motivo: 'error de carga' })).error).toBeNull()
expect(await stock(cer)).toBe(22) // 24 −1 −1 −1 +1
expect((await e1.client.rpc('anular_venta', { p_venta_id: v1.venta_id, p_motivo: 'x' })).error?.message).toBe('VENTA_NO_ANULABLE')
expect((await e1.client.rpc('ventas_del_turno')).data!.find(v => v.id === v1.venta_id)!.estado).toBe('anulada')
```

Test separado "cierre con ventas" (turno nuevo, fondo `100000/0`, cotización 1450): efectivo_gs total 31000 recibido 50000; efectivo_brl R$ 50 sobre 31000; transferencia 31000; tarjeta 31000; una venta efectivo_gs recibido 50000 **anulada**; salida PYG 20000. Cerrar con contado `69500 / 50`:

```ts
expect(r).toMatchObject({ esperado_gs: 69500, diferencia_gs: 0, transferencias_gs: 31000, tarjetas_gs: 31000 })
expect(Number(r.esperado_brl)).toBe(50); expect(Number(r.diferencia_brl)).toBe(0)
// y después del cierre no se anula
expect((await e1.client.rpc('anular_venta', { p_venta_id: unaDelTurno, p_motivo: 'x' })).error?.message).toBe('VENTA_NO_ANULABLE')
```

- [ ] **Step 2: Run** `npm run test:db -- ventas` → FAIL.
- [ ] **Step 3: Implement** migración `ventas`.
- [ ] **Step 4: Run** `npm run test:db` → PASS (todas las suites). `npm run db:types && npm run typecheck`.
- [ ] **Step 5: Commit** `git commit -m "feat(db): registro de ventas atómico, cobro en ₲/R$, anulación"`

---

### Task 8: Login de dueños y empleados, guards de sección

**Files:**
- Create: `lib/supabase/{server,client,admin,proxy}.ts`, `proxy.ts`, `lib/auth/{acceso,sesion,acciones}.ts`, `app/pos/login/page.tsx`, `app/pos/(protegido)/{layout,page}.tsx`, `app/admin/login/page.tsx`, `app/admin/(protegido)/{layout,page}.tsx`, `scripts/crear-dueno.ts`, `.env.example`, `tests/unit/acceso.test.ts`

**Interfaces:**
- Consumes: `validarUsuario`, `validarPin`, `emailDeUsuario` (Task 1); `types/supabase.ts`
- Produces:
  - `crearClienteServidor(): Promise<SupabaseClient<Database>>` (`@supabase/ssr` + `cookies()`), `crearClienteNavegador(): SupabaseClient<Database>`, `crearClienteAdmin(): SupabaseClient<Database>` (service role, `import 'server-only'`)
  - `actualizarSesion(request: NextRequest): Promise<NextResponse>` usado por `proxy.ts` (`export async function proxy(request: NextRequest)`, matcher que excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes)
  - `type Rol = 'dueno' | 'empleado'`; `type Perfil = { id: string; nombre: string; rol: Rol; activo: boolean }`; `type Seccion = 'pos' | 'admin'`
  - `resolverAcceso(perfil: Pick<Perfil, 'rol' | 'activo'> | null, seccion: Seccion): 'permitir' | 'login'` — null o inactivo → `login`; `admin` solo `dueno`; `pos` cualquier rol activo
  - `obtenerPerfil(): Promise<Perfil | null>`; `requerirAcceso(seccion: Seccion): Promise<Perfil>` (redirige a `/${seccion}/login`)
  - `type EstadoLogin = { error: string | null }`; `loginEmpleado(prev: EstadoLogin, fd: FormData): Promise<EstadoLogin>` (campos `usuario`, `pin`; formato inválido, credencial mala o perfil inactivo → `'Usuario o PIN incorrecto'`; ok → `redirect('/pos')`); `loginDueno(prev, fd)` (campos `email`, `password`; error → `'Email o contraseña incorrectos'`; rol no dueño o inactivo → `signOut` + `'Esta cuenta no tiene acceso al panel'`; ok → `redirect('/admin')`); `cerrarSesion(seccion: Seccion): Promise<void>`
  - Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (en `.env.example` sin valores)
  - `npx tsx scripts/crear-dueno.ts <email> <password> <nombre>` — crea usuario Auth (`email_confirm: true`) + perfil `dueno`

- [ ] **Step 1: Write the failing test** `tests/unit/acceso.test.ts`

```ts
expect(resolverAcceso(null, 'pos')).toBe('login')
expect(resolverAcceso({ rol: 'empleado', activo: true }, 'pos')).toBe('permitir')
expect(resolverAcceso({ rol: 'empleado', activo: true }, 'admin')).toBe('login')
expect(resolverAcceso({ rol: 'dueno', activo: true }, 'admin')).toBe('permitir')
expect(resolverAcceso({ rol: 'dueno', activo: true }, 'pos')).toBe('permitir')
expect(resolverAcceso({ rol: 'dueno', activo: false }, 'admin')).toBe('login')
```

- [ ] **Step 2: Run** `npm test -- acceso` → FAIL.
- [ ] **Step 3: Implement** `lib/auth/acceso.ts`, clientes Supabase, `proxy.ts`, `sesion.ts`, `acciones.ts`.
- [ ] **Step 4: Implement páginas.** Login POS: input `usuario` (autoComplete `username`) + input `pin` (`inputMode="numeric"`, `maxLength={6}`, `type="password"`), `useActionState(loginEmpleado)`, error en `role="alert"`. Login admin: email + contraseña. Layouts `(protegido)` llaman `requerirAcceso('pos' | 'admin')`; páginas placeholder muestran `Hola, {nombre}` y botón "Cerrar sesión". Componentes shadcn: `button`, `input`, `label`, `card` (`npx shadcn@latest add button input label card`). Sin diseño visual todavía.
- [ ] **Step 5: Run** `npm test && npm run test:db && npm run typecheck && npm run lint && npm run build` → todo PASS.
- [ ] **Step 6: Verificación manual.** `cp .env.example .env.local` y completar con `npx supabase status`; `npx tsx scripts/crear-dueno.ts dueno@test.local secreto-123 Carlos`; `npm run dev`:
  - `/admin` sin sesión → redirige a `/admin/login`; login correcto → "Hola, Carlos"; contraseña mala → "Email o contraseña incorrectos".
  - `/pos` sin sesión → `/pos/login`; el dueño también entra a `/pos`.
  - Cerrar sesión vuelve al login de su sección.
- [ ] **Step 7: Commit** `git commit -m "feat(auth): login de dueños y empleados, guards de /pos y /admin"`
