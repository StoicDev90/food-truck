# Despliegue (Vercel + Supabase)

## Variables de entorno en Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)
- [ ] `EMPLEADO_PIN_PEPPER` (solo servidor; `openssl rand -base64 48`, mín. 32 caracteres)
- Los dos secretos nunca llevan prefijo `NEXT_PUBLIC_`.
- Rotar `EMPLEADO_PIN_PEPPER` invalida todos los PINs: hay que resetearlos todos.

## Panel de Supabase (Authentication)
La configuración de `supabase/config.toml` solo vale en local; en producción se hace a mano.
- [ ] Desactivar signup (Sign In / Providers: "Allow new users to sign up" apagado).
- [ ] Longitud mínima de contraseña: 12.
- [ ] Subir `sign_in_sign_ups` en Rate Limits. Es seguro: la contraseña del empleado depende del pepper y el login pasa por el limitador propio.

## Base de datos
- [ ] Aplicar migraciones solo por CLI: `npx supabase link` y `npx supabase db push`.
- [ ] No crear tablas ni funciones desde Studio: los permisos por defecto de `supabase_admin` darían acceso a `anon` y `authenticated`.
- La migración `20261106070000_default_acl_funciones.sql` revoca EXECUTE de PUBLIC en funciones futuras de todos los esquemas. Una función de auth hook futura debe hacer `grant execute ... to supabase_auth_admin` explícito.

## Tras el primer deploy
- [ ] Verificar que el encabezado `x-vercel-forwarded-for` llega a la app (el límite por IP depende de él).
- [ ] Crear el primer dueño (contraseña de 12+ caracteres):
  `npx tsx --env-file=.env.local scripts/crear-dueno.ts <email> <password> <nombre>`

## Plan 3 (usuarios)
- Crear empleados y resetear PINs con `passwordEmpleado(usuario, pin)` de `lib/auth/pin.ts`; nunca enviar el PIN crudo como contraseña.
