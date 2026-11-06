# Diseño: Sistema web del food truck (Parque Tacurú Pucú, Itaipú)

Fecha: 2026-11-06 · Estado: aprobado por los dueños

Convención: lo marcado **[call de Claude]** fue propuesto por Claude y aceptado sin discusión de fondo; el resto lo decidieron los dueños.

## 1. Intención

Food truck ubicado en el Parque Tacurú Pucú (complejo de la represa Itaipú, Hernandarias, Paraguay). Vende comidas (empanadas, coxinhas, sándwiches de carne asada o pollo, etc.) y bebidas con y sin alcohol (permiso de venta de alcohol ya obtenido).

El sistema es una sola web con tres partes que comparten productos, precios y stock:

1. **Menú público**: el cliente escanea un QR en el truck y ve el menú con fotos y precios.
2. **Punto de venta (POS)**: el único empleado del turno registra cada venta, cobra y cierra la caja.
3. **Panel de los dueños**: cargan productos, precios y stock; controlan el dinero y sacan reportes.

Nombre comercial pendiente entre: Oasis Itaipu, Crocante de Itaipu, La picada del Parque, Parador Silvestre, Rustico y Natural. El sistema debe tomar el nombre desde configuración, no hardcodeado.

## 2. Objetivos

- El cliente ve en el celular, en segundos, qué hay, cuánto cuesta y qué está agotado.
- El empleado registra una venta en pocos toques, con el vuelto calculado.
- La caja cuadra al cierre de cada turno en guaraníes y en reales, considerando todo movimiento de dinero.
- Los dueños ven ventas, medios de pago, más vendidos, ganancia (si cargan costo), anulaciones y diferencias de caja, sin que los números históricos cambien.

## 3. No-objetivos (fuera de v1)

- Pedidos o pagos online desde el menú público.
- Facturación: se maneja aparte con aparatos externos y ticket fiscal. Nada de SIFEN/timbrado.
- Integración con posnet o banco (tarjeta y transferencia solo se registran).
- Funcionamiento offline del POS (hay wifi y un celular de respaldo como hotspot).
- Stock por ingredientes/recetas.
- Pagos mixtos (más de un medio de pago por venta).
- Menú en portugués **[call de Claude; se puede agregar después]**.
- Múltiples trucks o múltiples cajas simultáneas.

## 4. Anti-objetivos (sería un fracaso aunque funcione)

- Un POS lento o con muchos pasos en la ventanilla.
- Reportes viejos que cambian cuando cambia la cotización o un precio.
- Un empleado que pueda alterar precios, productos o el número de stock directamente (incluso llamando a la API de Supabase).
- Una caja que "no cuadra" porque hubo salidas de dinero no registradas.
- Que el menú público muestre como disponible algo agotado.

## 5. Restricciones

- Stack fijado en `CLAUDE.md`: Next.js 16.4.5 (App Router, Server Actions, Server Components), Tailwind + shadcn/ui, Supabase (Postgres + Auth + RLS), Vitest + React Testing Library, Vercel.
- RLS estricta en toda tabla. Ventas, stock y precios solo se modifican desde Server Actions/endpoints protegidos.
- Tipos generados con `npx supabase gen types typescript --local > types/supabase.ts` tras cada cambio de esquema.
- TDD (Vitest), spec-first en `docs/specs/`.
- Moneda base: guaraní (₲, sin decimales, se guarda como entero). Real (R$) con 2 decimales.
- Zona horaria del negocio: `America/Asuncion` para "día", turnos, horarios y reportes.
- Un solo empleado por turno, un solo dispositivo POS.

## 6. Approaches considerados

| | Enfoque | Trade-off |
|---|---|---|
| **A (elegido)** | Una sola app Next.js con tres secciones: `/` (menú), `/pos`, `/admin` | Un deploy, un modelo de datos, una capa de permisos. Lo más simple para un truck con un empleado por turno. |
| B | Dos apps (menú + admin / POS) | Solo se justifica con POS offline o varios trucks; duplica config, deploy y auth. |
| C | POS comercial (tipo Loyverse) + menú web propio | Barato al inicio, pero no maneja bien cobro en reales con cotización guardada por venta ni el cierre en dos monedas; dependencia externa. |

Los dueños eligieron **A**.

## 7. Moneda y cotización

- **Precios de productos**: se guardan solo en ₲.
- **Menú público**: muestra solo ₲.
- **POS y panel**: muestran ₲ y al lado el equivalente en R$, calculado con la cotización del día (no se guarda en productos).
- **Pagos**: se guardan en la moneda en que entraron. Un pago en reales guarda el monto en R$ recibido, la cotización usada y su equivalente en ₲. Así la caja refleja billetes en ambas monedas y los reportes viejos no cambian.
- **Cotización del día**: una tarea programada (Vercel Cron) toma una vez por día la cotización **oficial** (Banco Central del Paraguay o fuente oficial similar) y la guarda.
- **Carga manual**: solo los dueños, logueados con su usuario y contraseña, pueden fijar a mano la cotización del día cuando lo requieran. La manual tiene prioridad sobre la de la API ese día. Los empleados nunca pueden cargarla.
- **Si no hay cotización del día** (la API falló y ningún dueño la cargó a mano): el POS **bloquea el cobro en Efectivo R$** ese día y muestra el motivo. No se usa la cotización del día anterior. El equivalente en R$ del POS y el panel se muestra como "sin cotización". Los demás medios de pago siguen funcionando.
- Unidad de cotización: ₲ por 1 R$.

## 8. Menú público (`/`)

- Mobile-first, una sola página, entrada vía QR (URL fija).
- Encabezado: logo, nombre, estado "Abierto · cierra HH:MM" / "Cerrado" calculado desde el horario configurado.
- Pestañas/categorías fijas arriba: Comidas, Bebidas sin alcohol, Bebidas con alcohol (categorías administrables).
- Cada producto: foto, nombre, descripción corta, precio en ₲.
- Stock 0 → se muestra en gris con etiqueta "Agotado" (no se oculta). Productos con "visible = no" no aparecen.
- Pie: horario, ubicación en el parque con mapa, botones WhatsApp e Instagram.
- Se sirve desde caché y se revalida cada vez que una venta, anulación, movimiento de stock o cambio de producto/config ocurre (`revalidateTag`) **[call de Claude]**.

```
┌──────────────────────────┐
│  [logo] Nombre del truck │
│  Abierto · cierra 20:00  │
├──────────────────────────┤
│ Comidas│Bebidas│Alcohol  │
├──────────────────────────┤
│ [foto] Empanada de carne │
│        Jugosa, al horno  │
│        ₲ 8.000           │
├──────────────────────────┤
│ [foto] Coxinha  AGOTADO  │
├──────────────────────────┤
│ Horario · Mapa · WA · IG │
└──────────────────────────┘
```

## 9. Usuarios y acceso

- Roles: **dueño** y **empleado**. Los dueños tienen además todos los permisos del empleado (pueden operar el POS) **[call de Claude]**.
- Dueños: email + contraseña (Supabase Auth).
- Empleados: usuario real de Supabase Auth creado por un dueño desde el panel (vía service role en Server Action). Entran con nombre de usuario + PIN de 6 dígitos (Supabase exige ≥ 6 caracteres). El email interno es sintético y no lo ve nadie **[call de Claude]**.
- El dueño puede desactivar un empleado y resetear su PIN.
- RLS por rol en todas las tablas: el empleado solo lee lo necesario para operar y solo escribe a través de las funciones de base de datos listadas en §13.
- El POS es instalable como PWA en la tablet/celular (manifest), sin modo offline. Si se pierde conexión, se muestra un aviso y no se permite confirmar ventas.

## 10. POS (`/pos`)

### 10.1 Turnos
- Solo puede haber **un turno abierto** a la vez. Mientras esté abierto, nadie más puede abrir otro: el titular lo cierra, o un dueño lo **cierra forzado** cargando él mismo el conteo (queda registrado quién cerró) **[call de Claude]**.
- Un dueño puede vender dentro del turno abierto de un empleado; la venta queda a nombre de quien la registró, dentro de ese turno **[call de Claude]**.
- Un turno puede pasar la medianoche; pertenece al día en que se abrió **[call de Claude]**.
- El empleado abre turno declarando el fondo inicial de caja (₲ y R$; R$ normalmente 0) **[R$ en fondo: call de Claude]**. El POS propone como valor por defecto lo contado al cierre del turno anterior; si el empleado declara otro monto, la diferencia entre turnos se muestra en los reportes **[call de Claude]**.
- Sin turno abierto no se pueden registrar ventas ni movimientos de caja.
- **Conteo a ciegas**: el POS nunca le muestra al empleado el efectivo esperado (ni durante el turno ni al cerrar). Al cerrar, el empleado cuenta ₲ y R$ por separado, los carga y confirma; recién entonces se muestra lo esperado y la diferencia. El conteo confirmado es final para el empleado: solo un dueño puede corregirlo, y la corrección queda registrada (quién, cuándo, valor anterior y nuevo). Después del cierre, la sesión del empleado se cierra.

### 10.2 Venta
- Grilla de productos con botones grandes (por categoría). Tocar un producto suma 1; + y − para ajustar.
- Total en ₲ con equivalente en R$.
- Productos sin stock no se pueden agregar. Al confirmar, si el stock ya no alcanza, la venta se rechaza completa.
- Confirmar → elegir medio de pago → registrar. La venta, sus ítems, el pago y el descuento de stock ocurren en una sola transacción.
- Cada ítem guarda el precio unitario y el costo unitario vigentes al momento de la venta (para que los reportes no cambien si después se edita el precio).

```
┌─────────────────────────────────────┐
│ Turno: Juan · abierto 07:00         │
├───────────────────────┬─────────────┤
│ [Empanada] [Coxinha]  │ Pedido      │
│ [Sándw.carne][Pollo]  │ 2 Empanada  │
│ [Agua] [Gaseosa]      │ 1 Cerveza   │
│ [Cerveza] [Fernet]    │─────────────│
│                       │ ₲ 31.000    │
│                       │ R$ 21,40    │
│                       │ [COBRAR]    │
└───────────────────────┴─────────────┘
```

### 10.3 Cobro
- Medios: **Efectivo ₲ / Efectivo R$ / Transferencia (alias) / Tarjeta (crédito o débito)**. Un solo medio por venta.
- Transferencia y tarjeta: el empleado confirma que el pago entró; se registra el medio y el monto (= total).
- Efectivo ₲: el empleado carga cuánto recibió; el sistema calcula el vuelto en ₲.
- Efectivo R$: el empleado carga los R$ recibidos; el sistema calcula su equivalente en ₲ con la cotización vigente y el vuelto **siempre en ₲**. El monto recibido debe cubrir el total. Si no hay cotización del día, esta opción está deshabilitada (ver §7).
- Redondeo del vuelto en ₲: lo define el builder (propuesta: al múltiplo de 100 más cercano, ya que no circulan monedas menores) **[call de Claude]**.

```
Cobrar ₲ 31.000
[Efectivo ₲][Efectivo R$][Transf.][Tarjeta]

Efectivo R$ · cotización 1 R$ = ₲ 1.450
Recibido: R$ 50  → equivale ₲ 72.500
Vuelto:   ₲ 41.500
[CONFIRMAR]
```

### 10.4 Anulación
- Solo ventas del turno abierto, con motivo obligatorio.
- La venta no se borra: queda marcada como anulada (quién, cuándo, motivo), se devuelve el stock con un movimiento de "anulación" y deja de contar en lo esperado de caja.
- Después de cerrado el turno no se anula; cualquier corrección posterior se hace con ajustes de stock **[call de Claude]**.

### 10.5 Movimientos de caja
- Se registra **todo** movimiento de dinero que no sea venta, en ambos sentidos:
  - **Salidas**: retiro de un dueño, pago a proveedor, otro egreso.
  - **Entradas**: aporte de cambio (un dueño trae billetes chicos), otro ingreso **[call de Claude: los dueños pidieron registrar todo movimiento]**.
  - Un cambio de moneda dentro de la caja (ej. sacar R$ y poner ₲) se registra como una salida en una moneda + una entrada en la otra **[call de Claude]**.
- Cada movimiento: tipo, sentido, monto, moneda (₲ o R$), motivo obligatorio, quién lo registró, hora, turno.
- Los registra el empleado desde el POS en el momento (también un dueño).

### 10.6 Ingreso de stock desde el POS
- El empleado puede registrar ingresos ("preparé 15 sándwiches de carne"). No puede editar productos, precios ni hacer ajustes.

### 10.7 Cierre de turno

```
Cierre turno Juan        ₲          R$
Fondo inicial        100.000        0
+ Ventas efectivo  1.250.000      120
− Retiros/pagos     −530.000        0
= Esperado           820.000      120
  Contado            815.000      120
  Diferencia          −5.000        0
Transferencias: ₲ 480.000 · Tarjetas: ₲ 910.000
```

Fórmulas (ventas anuladas excluidas):
- Esperado ₲ = fondo ₲ + Σ efectivo ₲ recibido − Σ vuelto ₲ (de todos los pagos en efectivo, incluidos los pagados en R$) + Σ entradas ₲ − Σ salidas ₲.
- Esperado R$ = fondo R$ + Σ R$ recibidos + Σ entradas R$ − Σ salidas R$.
- Transferencias y tarjetas se informan como totales en ₲ para controlar contra banco y posnet.

## 11. Panel de los dueños (`/admin`)

### 11.1 Productos
- Nombre, categoría, descripción, foto, precio ₲, stock actual (solo lectura, ver §11.2), interruptor visible/oculto en el menú público.
- Costo unitario opcional. Si no se carga, los reportes no muestran ganancia para ese producto.
- Fotos en Supabase Storage (bucket público de lectura, escritura solo dueños).
- Categorías administrables (nombre, orden).

### 11.2 Movimientos de stock
- El stock nunca se pisa directamente. Todo cambio es un movimiento: **ingreso** (compra/producción), **venta** (automático), **anulación** (devuelve), **ajuste** con motivo (merma, vencido, error de conteo; puede ser positivo o negativo).
- Historial por producto: quién, cuándo, cuánto, motivo.

### 11.3 Reportes
- Ventas por día o rango de fechas, separadas por medio de pago y por moneda.
- Productos más vendidos, en cantidad y en ₲ (y ganancia si hay costo).
- Cierre diario: suma de los turnos del día con la diferencia de caja de cada uno. Un turno pertenece al día en que se abrió **[call de Claude]**.
- Ventas anuladas con motivo y empleado.
- Ventas por empleado.
- Movimientos de caja (salidas) por rango.

### 11.4 Configuración
- Usuarios: crear empleados, asignar/resetear PIN, desactivar.
- Cotización del real: ver la de la API del día, fijar una manual para ese día.
- Datos del negocio y menú público: nombre, logo, horario por día de semana, WhatsApp, Instagram, ubicación (coordenadas o enlace a mapa).

## 12. Modelo de datos (propuesta; el builder puede ajustar nombres y detalles)

- `perfiles` (id = auth.users.id, nombre, usuario, rol `dueno|empleado`, activo)
- `categorias` (id, nombre, orden)
- `productos` (id, categoria_id, nombre, descripcion, foto_path, precio_gs int, costo_gs int null, stock int, controla_stock bool default true, visible bool, activo bool). Si `controla_stock = false` el producto nunca figura agotado ni bloquea ventas (para algo hecho al momento, si aparece) **[call de Claude]**.
- `movimientos_stock` (id, producto_id, tipo `ingreso|venta|anulacion|ajuste`, cantidad int con signo, motivo, usuario_id, venta_id null, turno_id null, created_at)
- `turnos` (id, empleado_id, abierto_at, cerrado_at, fondo_gs, fondo_brl, contado_gs, contado_brl)
- `ventas` (id, turno_id, empleado_id, total_gs, estado `confirmada|anulada`, anulada_por, anulada_at, anulada_motivo, created_at)
- `venta_items` (id, venta_id, producto_id, cantidad, precio_unitario_gs, costo_unitario_gs null)
- `pagos` (id, venta_id unique, medio `efectivo_gs|efectivo_brl|transferencia|tarjeta`, moneda `PYG|BRL`, monto_recibido numeric, cotizacion numeric null, equivalente_gs int, vuelto_gs int)
- `movimientos_caja` (id, turno_id, sentido `entrada|salida`, tipo `retiro|pago_proveedor|aporte_cambio|cambio_moneda|otro`, moneda, monto numeric, motivo, usuario_id, created_at)
- `turnos` además guarda `cerrado_por` (para cierres forzados por un dueño).
- `correcciones_conteo` (id, turno_id, dueno_id, contado_gs_anterior, contado_brl_anterior, contado_gs_nuevo, contado_brl_nuevo, motivo, created_at).
- RLS: el empleado no puede leer los totales esperados de caja; el cálculo de lo esperado se expone solo al cerrar (en la respuesta de `cerrar_turno`) y a los dueños.
- `cotizaciones` (fecha date pk, valor_api numeric null, valor_manual numeric null, fuente, actualizado_por, updated_at). Valor efectivo = manual ?? api ?? última conocida.
- `configuracion` (fila única: nombre, logo_path, horarios jsonb, whatsapp, instagram, ubicacion)

`productos.stock` es un valor derivado que solo actualizan las funciones de §13 al insertar movimientos.

## 13. Operaciones de escritura

Toda escritura de negocio pasa por Server Actions que validan sesión/rol y llaman funciones Postgres transaccionales. Las funciones verifican rol y estado (turno abierto, stock suficiente). Lista mínima:

- `abrir_turno`, `cerrar_turno`
- `registrar_venta` (ítems + pago + movimientos de stock, atómico)
- `anular_venta`
- `registrar_movimiento_caja`
- `registrar_ingreso_stock` (empleado y dueño), `ajustar_stock` (solo dueño)
- `corregir_conteo` (solo dueño)
- CRUD de productos/categorías/configuración/cotización manual/usuarios (solo dueño)

Tras cada una que afecte el menú, `revalidateTag` del menú público.

## 14. Pendiente de los dueños

- Nombre comercial definitivo (entre los cinco candidatos).
- Identidad visual (logo, colores, tipografía, fotos de productos). Los dueños van a aportar fotos del truck; se define en un diseño visual aparte, que no cambia la arquitectura de este documento.

## 15. Queda a criterio del builder

- Estructura de carpetas, nombres exactos de tablas/funciones, componentes shadcn a usar.
- Diseño visual detallado siguiendo `web-design-guidelines` y las pautas UI/UX de `CLAUDE.md`.
- Estrategia de tests (unitarios de cálculo de vuelto/cierre, integración de funciones Postgres contra Supabase local).
- Proveedor concreto de la API de cotización oficial (BCP o fuente oficial similar) y horario del cron (propuesta: temprano a la mañana, hora de Asunción).
- Paginación y filtros de reportes; exportación (CSV) si es trivial.
