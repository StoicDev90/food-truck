# Diseño visual: Oasis Itaipu (menú, POS, panel)

Fecha: 2026-11-06 · Estado: aprobado por los dueños · Complementa a `docs/specs/2026-11-06-food-truck-sistema-design.md` (spec del sistema), que sigue siendo la autoridad sobre comportamiento y datos.

Alcance: este documento define el aspecto. Las pantallas se construyen en los Planes 2 (POS), 3 (panel) y 4 (menú), siguiendo la spec del sistema para el comportamiento y este documento para el aspecto. La base visual (tokens, fuentes, tema, logo) es la primera tarea del Plan 2 y la reutilizan los demás **[call de Claude]**.

Convención: lo marcado **[call de Claude]** fue propuesto por Claude; el resto lo decidieron los dueños en la sesión de diseño del 2026-11-06. Los mockups de esa sesión son descartables (no están en el repo); este documento es la referencia.

## 1. Intención

Darle al sistema una identidad visual propia bajo el nombre **Oasis Itaipu**, que se reconozca como el mismo truck que los clientes ven en el parque (rosa fuerte y morado, personajes de caricatura) y que tome el ambiente del Parque Tacurú Pucú (palmeras, el lago, la sombrilla de paja, el cartel de la playa). La misma identidad cubre las tres partes: menú público, POS y panel de dueños.

## 2. Objetivos

- El cliente reconoce el truck al abrir el menú y lo lee cómodo de noche y de día.
- El POS se lee bien durante todo el turno, de día en la ventanilla y de noche.
- Una sola fuente de colores y tipografía para las tres partes: cambiar un color se hace en un solo lugar.
- Todo texto cumple contraste WCAG AA (4.5:1; 3:1 para texto grande) en los dos temas.

## 3. No-objetivos

- Logo final de imprenta (vectorizado profesional, manual de marca). Los SVG de este documento son la dirección elegida y sirven para la web; un diseñador puede pulirlos después.
- Ilustraciones nuevas de las mascotas. Se usan las que ya tiene el truck, cuando los dueños las aporten.
- Fotos de productos: las aportan los dueños.

## 4. Anti-objetivos (sería un fracaso aunque se vea lindo)

- Usar el eslogan o el logo **"YO AMO Empanadas"** del truck (decisión de los dueños: no se usa).
- Texto de bajo contraste (gris sobre gris, blanco sobre rosa claro).
- Un POS "bonito" que agregue toques o pasos (spec del sistema §4: POS lento = fracaso).
- Destello de tema equivocado al cargar el menú (pantalla blanca de noche).
- Mascotas usadas como íconos de acciones (confunden: un ícono debe decir qué hace).

## 5. Approaches considerados (cómo se implementa el tema) **[call de Claude]**

| | Enfoque | Trade-off |
|---|---|---|
| **A (elegido)** | Tokens como variables CSS de shadcn/ui (`--background`, `--primary`, …) definidas en `:root` (claro) y `.dark` (noche) en `app/globals.css`, expuestas a Tailwind con `@theme inline`. Un componente se escribe una vez y cambia de tema solo. | Es el mecanismo nativo de shadcn + Tailwind 4; cero dependencias de estilo nuevas. Hay que pensar cada color como "rol", no como valor. |
| B | Paletas separadas por sección (menú / POS / panel) | Tres lugares para mantener; las secciones terminan divergiendo. |
| C | Solo prefijos `dark:` de Tailwind en cada componente | Duplica clases en cada componente; fácil olvidar uno y romper contraste. |

## 6. Identidad

### 6.1 Nombre
**Oasis Itaipu** (spec del sistema §1). Se toma de configuración en el menú, pero logo y metadatos usan este nombre.

### 6.2 Logo: sticker redondo (opción D, decisión de los dueños)
Círculo tipo sticker, como los stickers redondos de Flork que ya tiene el truck:
- Arriba, en arco: **OASIS ITAIPU** (Fredoka 700).
- Abajo, en arco: **PARQUE TACURÚ PUCÚ** (Fredoka 600, más chico).
- Centro: una palmera (las de la avenida del parque) con el sol detrás.
- Versión noche: fondo `#2e1245`, aro y texto superior `#f472b6`, texto inferior `#e9d5ff`, palmera `#fdf4ff`, sol `#fde047`.
- Versión clara: fondo blanco, aro y texto superior `#7e22ce`, texto inferior `#be185d`, palmera `#db2777`, sol `#facc15`.
- **Icono chico** (favicon, ícono de PWA, barra fija del menú, barra del panel): solo la palmera con el sol, sin texto. El sticker no se usa por debajo de ~64 px porque el texto en arco deja de leerse.

Uso por lugar **[call de Claude]**: menú arriba = sticker ~130 px en la versión del tema activo; barra fija del menú = ícono palmera del tema activo; barra del POS y lateral del panel (siempre oscuras) = ícono palmera versión noche; favicon e íconos de la PWA (spec del sistema §9: manifest) = palmera sobre fondo `#1e0b2e`, en 192 px, 512 px y versión *maskable* con margen de seguridad. El logo dentro de la app se usa como SVG inline (toma Fredoka cargada con `next/font`); donde va como imagen (favicon, PWA) se usa la palmera, que no tiene texto, así que no depende de la fuente.

Archivos de referencia: `docs/design/logo/sticker-noche.svg`, `docs/design/logo/sticker-claro.svg`, `docs/design/logo/palmera-icono.svg`.

### 6.3 Mascotas y dibujos
Los personajes del truck (dibujo estilo Flork, el chanchito) están permitidos como **decoración**: encabezado del menú, estados vacíos ("no hay productos en esta categoría"), pantalla de turno cerrado. Nunca como ícono de una acción ni dentro de botones. Hasta que los dueños aporten las ilustraciones, esos lugares quedan sin dibujo (no se inventan personajes).

## 7. Color

### 7.1 Tokens (roles)

| Rol (variable shadcn) | Noche (`.dark`) | Claro (`:root`) | Uso |
|---|---|---|---|
| `--background` | `#1e0b2e` | `#faf7fc` | Fondo de página |
| `--foreground` | `#fdf4ff` | `#2a0e3f` | Texto principal |
| `--card` | `#2e1245` | `#ffffff` | Tarjetas, paneles |
| `--popover` | `#2e1245` | `#ffffff` | Diálogos (cobro, turno), menús desplegables |
| `--superficie-boton` (custom) | `#3b1658` | `#ffffff` con borde `--border` | Botones de producto del POS |
| `--card-foreground` | `#fdf4ff` | `#2a0e3f` | |
| `--muted` | `#2e1245` | `#f3e8ff` | Chips/tabs inactivos, fondos suaves (en noche coincide con `--card` a propósito: los chips inactivos se ven como tarjetas) |
| `--muted-foreground` | `#e9d5ff` | `#6b21a8` | Texto secundario |
| `--primary` | `#db2777` | `#db2777` | **Rellenos** de botones de acción (COBRAR, CONFIRMAR, tab activa en noche) |
| `--primary-foreground` | `#ffffff` | `#ffffff` | Texto sobre primary |
| `--secondary` | `#7e22ce` | `#7e22ce` | Tab activa (claro), selección, acentos morados |
| `--secondary-foreground` | `#ffffff` | `#ffffff` | |
| `--accent` (superficie shadcn) | `#3b1658` | `#f3e8ff` | Hover / ítem seleccionado en Select, Dropdown, Command (uso estándar de shadcn) |
| `--marca` (custom, texto de marca) | `#f472b6` | `#7e22ce` | Títulos, nombre, encabezados de sección |
| `--precio` (custom) | `#fde047` | `#be185d` | Precios |
| `--border` / `--input` | `#3b1658` | `#e9d5ff` | Bordes, separadores, campos de texto (en noche distinto de `--card` para que se vean) |
| `--ring` | `#f472b6` | `#7e22ce` | Foco visible (teclado) |
| `--exito` (custom) | `#047857` sobre `#ecfdf5` | igual | Vuelto, "venta registrada", diferencia 0 |
| `--destructive` | `#b91c1c` (texto: `#fca5a5` sobre fondo noche) | `#b91c1c` | Faltante de caja, errores; `--destructive-foreground` blanco |
| `--aviso` (custom) | `#9a3412` sobre `#fff7ed` | igual | "Sin stock", conteo final |
| Barra superior POS y lateral del panel | `#160822` / `#1e0b2e` | `#1e0b2e` (se mantiene oscura) | Marca constante en ambos temas |

### 7.2 Contraste verificado (WCAG, calculado)

| Par | Ratio |
|---|---|
| `#fdf4ff` sobre `#1e0b2e` | 17.1 |
| `#f472b6` sobre `#1e0b2e` | 6.9 |
| `#fde047` sobre `#1e0b2e` | 13.9 |
| `#e9d5ff` sobre `#2e1245` | 12.0 |
| `#fde047` sobre `#3b1658` (botón de producto, noche) | 11.1 |
| blanco sobre `#db2777` | 4.6 |
| blanco sobre `#7e22ce` | 7.0 |
| `#2a0e3f` sobre `#faf7fc` | 16.0 |
| `#be185d` sobre `#faf7fc` | 5.7 |
| `#6b21a8` sobre `#f3e8ff` | 7.4 |
| `#047857` sobre `#ecfdf5` | 5.2 |

`--primary` es el mismo en los dos temas a propósito. La pestaña activa del menú usa `--primary` en noche y `--secondary` en claro (se decide en el componente, como en los mockups aprobados). Los tokens de shadcn no listados (`chart-*`, `sidebar-*`) se derivan de esta tabla respetando §7.2 **[call de Claude]**.

Reglas que salen de esa verificación:
- **Nunca texto blanco sobre `#ec4899`** (3.5:1, no pasa). El rosa vivo `#ec4899` / `#f472b6` es para texto o bordes sobre fondo oscuro; los rellenos con texto usan `#db2777`.
- Botón de WhatsApp: verde `#15803d` con texto blanco (el `#16a34a` da 3.3:1).
- Deshabilitado (producto sin stock, "Efectivo R$ · sin cotización"): opacidad reducida, pero el texto que explica el motivo se mantiene legible (≥ 4.5:1).

## 8. Tipografía

- **Fredoka** (600–700): nombre, títulos, precios, montos grandes, botones principales.
- **Nunito** (400–900): todo el resto (texto, etiquetas, tablas).
- Cargadas con `next/font/google` (sin pedidos a Google en runtime, sin salto de layout) **[call de Claude]**.
- Escala: cuerpo 16 px mínimo en menú y POS (14 px en tablas del panel); precios del menú 18 px; total del POS 30 px; botones de producto 14 px nombre / 15 px precio.
- Números de dinero: `font-variant-numeric: tabular-nums` en totales, tablas y vuelto, para que no "bailen".
- Formato: `₲ 31.000` (punto de miles, sin decimales); `R$ 21,38` (coma decimal). Spec del sistema §5.

## 9. Temas noche / claro

- **Menú público**: la primera visita sigue la configuración del teléfono (`prefers-color-scheme`). Botón redondo sol/luna arriba a la derecha (44 × 44 px), que muestra ☀ en tema noche y ☾ en claro; al hacer scroll, el botón queda en la barra fija. La elección queda guardada en ese teléfono (decisión de los dueños).
- **POS y panel**: arrancan en la configuración del dispositivo; botón sol/luna en la barra superior; la elección queda guardada en ese dispositivo (decisión de los dueños: ambos temas con interruptor).
- Preferencias guardadas por separado **[call de Claude]**: una clave para el menú público y otra compartida por POS y panel, para que la elección de un cliente nunca cambie el tema de la tablet del truck.
- **Sin destello**: el menú sigue siendo estático/en caché; la clase `.dark` se pone en `<html>` antes de pintar (script inline mínimo en el `<head>`, o `next-themes` con `attribute="class"`), aunque el menú se sirva desde caché. `suppressHydrationWarning` en `<html>` **[call de Claude]**.
- Cada pantalla se revisa en los dos temas antes de darla por terminada.

## 10. Menú público (`/`)

Estructura según spec del sistema §8, con este aspecto:
- **Arriba (sin scroll)**: sticker grande (~130 px) centrado sobre un degradé radial suave del color de fondo; debajo, píldora de estado "● Abierto · cierra 22:00" (punto verde) o "Cerrado", calculado en el navegador a partir del horario de configuración en `America/Asuncion`, para que la caché del menú no muestre un estado viejo **[call de Claude]**; botón de tema arriba a la derecha.
- **Al hacer scroll** (decisión de los dueños): el sticker grande se va; queda fija arriba una barra con el ícono de palmera + "Oasis Itaipu" + botón de tema, y debajo las pestañas de categorías.
- Cambio de encabezado: por umbral de scroll con una transición corta (≤ 200 ms, sin animación si `prefers-reduced-motion`) **[call de Claude]**.
- **Pestañas**: tocar una hace scroll suave a su sección y la pestaña activa sigue la sección visible (scroll-spy) **[call de Claude]**; píldoras; activa = relleno (`--primary` en noche, `--secondary` en claro); tocar una pestaña lleva a su sección.
- **Producto**: foto cuadrada 72 px con esquinas redondeadas 18 px, nombre (Nunito 800), descripción corta (opacidad ~0.75), precio (Fredoka, `--precio`).
- **Agotado**: el producto sigue visible, en gris (foto en escala de grises, textos atenuados) con etiqueta "AGOTADO" de alto contraste.
- **Pie**: horario por día (desde configuración), mapa del parque, botones WhatsApp e Instagram de ancho completo.
- Sin foto cargada: placeholder con la palmera, no un recuadro vacío; en un producto agotado el placeholder también va en gris, y lo que comunica el estado es la etiqueta "AGOTADO" **[call de Claude]**.

## 11. POS (`/pos`)

### 11.1 Dispositivo
Tablet grande en horizontal o laptop de 14" (decisión de los dueños). Diseño principal para ≥ 1280 px de ancho. Puntos de corte **[call de Claude]**: ≥ 1280 px grilla de 5 columnas + pedido a la derecha; 1024–1279 px, 4 columnas + pedido; 768–1023 px, 3 columnas + pedido más angosto; < 768 px (teléfono, respaldo) 2 columnas y el pedido en una barra inferior que se despliega.

### 11.2 Pantalla de venta
- **Barra superior** (siempre oscura): palmera + "Oasis Itaipu", "Turno: Juan · desde 07:00", cotización del día ("1 R$ = ₲ 1.450", o "Sin cotización" en rojo), estado de conexión ("● En línea" / banner rojo "Sin conexión" que deshabilita COBRAR; se detecta con `navigator.onLine` más un ping liviano al servidor cada ~15 s, y el servidor igual rechaza la venta si no llega **[call de Claude]**), botón de tema y menú ≡.
- **Menú ≡ del turno**: Ingreso de stock · Ventas del turno (para anular; lista sin límite, decisión de los dueños) · Cerrar turno. **Movimiento de caja aparece solo si quien está logueado es dueño** (decisión de los dueños; ver spec del sistema §10.5).
- **Grilla de productos**: 4–5 columnas en laptop / tablet grande, botones de al menos 76 px de alto (toque cómodo en tablet). Nombre + precio. Insignia rosa con la cantidad cuando está en el pedido. "quedan N" cuando el stock es bajo (umbral: ≤ 5) **[call de Claude]**. Stock 0: deshabilitado, "Sin stock".
- **Pedido** (columna derecha): líneas con − cantidad +, "Vaciar", total ₲ (Fredoka 30 px), equivalente "≈ R$ 21,38", botón COBRAR grande.
- **Teclado (laptop)** **[call de Claude]**: escribir filtra productos por nombre; Enter = COBRAR; en el cobro, 1–4 eligen medio de pago, números cargan el monto, Enter confirma, Esc cancela. Toda acción de teclado tiene también su botón.

### 11.3 Cobro
Ventana sobre la pantalla de venta:
- Total a cobrar arriba; cuatro botones de medio de pago (Efectivo ₲, Efectivo R$, Transferencia, Tarjeta).
- Efectivo: botones rápidos de billetes (₲ 20.000 / 50.000 / 100.000; R$ 20 / 50 / 100 / 200) y "Exacto", además de escribir el monto. En R$ se muestra la cotización usada y el equivalente en ₲.
- **Vuelto en ₲** en grande, verde (`--exito`), redondeado a 100 (spec del sistema §10.3).
- Transferencia / tarjeta: "¿Entró el pago de ₲ X?" → "Sí, confirmar".
- CONFIRMAR se bloquea al instante y muestra "Registrando…" con un spinner hasta que el servidor responde (spec del sistema §10.2).
- Éxito: "Venta registrada · Vuelto ₲ X", se cierra sola a los 2 s y el pedido queda vacío **[call de Claude]**.
- Sin cotización del día: "Efectivo R$" deshabilitado con el motivo visible.

### 11.4 Turno
- **Abrir turno**: "Hola, {nombre}", fondo inicial ₲ (propuesto: lo contado en el cierre anterior) y R$; aviso de que un cambio al monto propuesto queda registrado.
- **Cerrar turno, paso 1 (a ciegas)**: el empleado carga lo contado en ₲ y R$; nunca se muestra lo esperado; aviso naranja "Al confirmar, el conteo queda final. Solo un dueño puede corregirlo."
- **Cerrar turno, paso 2**: tabla fondo / + ventas en efectivo / − retiros y pagos / = esperado / contado / diferencia (rojo si falta, verde si cero), más totales de transferencias y tarjetas. Botón "Listo · cerrar sesión". **Si nadie toca nada, la sesión se cierra sola a los 150 segundos** (decisión de los dueños) y vuelve al login; el siguiente turno entra con usuario y PIN.
- La protección del conteo a ciegas está en la base (solo `cerrar_turno` devuelve lo esperado, y al mismo tiempo cierra el turno); la pantalla no es la barrera.

## 12. Panel de dueños (`/admin`)

- Escritorio. Menú lateral fijo, siempre oscuro, con el ícono de palmera (versión noche), "Oasis Itaipu" y "Panel de dueños". Secciones:
  - Hoy (inicio)
  - **Operación**: Turnos y cierres (incluye cierre forzado y corrección de conteo), Movimientos de caja, Abrir POS
  - **Catálogo**: Productos, Stock, Categorías
  - **Reportes**: Ventas, Más vendidos, Anulaciones
  - **Ajustes**: Empleados, Cotización R$, Negocio y menú
- **Hoy**: barra con turno abierto (quién, desde cuándo), cotización del día y su origen (API / manual), botón de tema. Cuatro tarjetas: ventas del día (cantidad y anuladas), efectivo (₲ y R$ con equivalente), transferencias ("controlar con el banco"), tarjetas ("controlar con el posnet"). Tabla de más vendidos con ganancia ("sin costo" si no hay costo cargado). Recuadro "Atención": sin stock (con botón Ingresar), stock bajo, diferencias del último cierre, ventas anuladas.
- **Productos**: tabla con foto, nombre, categoría, precio, costo (solo dueños; "—" si no hay), stock (rojo en 0), visible/oculto en el menú, Editar.

## 13. Accesibilidad e interacción (todas las partes)

- Contraste según §7.2; foco visible con `--ring` en todo elemento interactivo.
- Objetivos táctiles ≥ 44 × 44 px.
- Íconos SVG (Lucide, que ya trae shadcn); sin emojis como íconos.
- Botones de solo ícono (tema, menú ≡) con `aria-label` en español.
- `lang="es"`. Animaciones cortas (150–250 ms) y respetando `prefers-reduced-motion`.
- El estado nunca se comunica solo con color: "Sin stock", "AGOTADO", "Sin conexión" llevan texto.

## 14. Lo que queda al builder

- Detalles de espaciado, radios y sombras dentro del estilo de los mockups (radios grandes 14–22 px, bordes suaves).
- Pasar el texto de los SVG del logo a trazos (o cargar Fredoka dentro del SVG) para que el logo no dependa de la fuente del navegador.
- Implementar y probar el cambio de tema con la caché del menú (sin destello).
- Revisar cada pantalla con las guías `web-design-guidelines` y `design-taste-frontend` del repo antes de cerrar cada plan.

## 15. Pendiente de los dueños

- Fotos de productos.
- Ilustraciones de las mascotas en buena calidad (si quieren usarlas en el menú).
- Horario real por día de semana, WhatsApp, Instagram y ubicación para la configuración.
- Pregunta abierta de la spec del sistema: en un turno que pasa la medianoche, el Efectivo R$ queda bloqueado desde las 00:00 hasta que exista la cotización del día. ¿Se acepta? Hasta que respondan, se construye como dice la spec del sistema §7 (bloqueado).
