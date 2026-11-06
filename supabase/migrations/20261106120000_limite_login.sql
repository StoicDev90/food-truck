-- Límite de intentos de login por cuenta e IP (spec §9). Solo service_role.

create table public.intentos_login (
  clave text primary key,
  fallos int not null default 0,
  ultimo_fallo timestamptz,
  bloqueado_hasta timestamptz
);
alter table public.intentos_login enable row level security;
revoke all on public.intentos_login from anon, authenticated;

create function public.login_bloqueado(p_cuenta text, p_ip text)
returns boolean
language sql security definer set search_path = ''
as $$
  select exists (
    select 1 from public.intentos_login
    where clave in (p_cuenta, p_ip) and bloqueado_hasta > now()
  )
$$;

-- Upsert atómico de una clave: reinicia si el último fallo pasó de 15 min; al llegar al umbral bloquea y pone fallos en 0.
create function public._contar_fallo_login(p_clave text, p_umbral int, p_bloqueo interval)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.intentos_login as t (clave, fallos, ultimo_fallo)
  values (p_clave, 1, now())
  on conflict (clave) do update set
    fallos = case
      when (case when t.ultimo_fallo < now() - interval '15 minutes' then 1 else t.fallos + 1 end) >= p_umbral then 0
      else (case when t.ultimo_fallo < now() - interval '15 minutes' then 1 else t.fallos + 1 end)
    end,
    bloqueado_hasta = case
      when (case when t.ultimo_fallo < now() - interval '15 minutes' then 1 else t.fallos + 1 end) >= p_umbral
        then now() + p_bloqueo
      else t.bloqueado_hasta
    end,
    ultimo_fallo = now()
$$;

create function public.registrar_fallo_login(p_cuenta text, p_ip text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._contar_fallo_login(p_cuenta, 5, interval '5 minutes');
  perform public._contar_fallo_login(p_ip, 20, interval '15 minutes');
end
$$;

create function public.limpiar_fallos_login(p_cuenta text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.intentos_login where clave = p_cuenta
$$;

revoke execute on function public._contar_fallo_login(text, int, interval) from public, anon, authenticated;
revoke execute on function public.login_bloqueado(text, text) from public, anon, authenticated;
revoke execute on function public.registrar_fallo_login(text, text) from public, anon, authenticated;
revoke execute on function public.limpiar_fallos_login(text) from public, anon, authenticated;
grant execute on function public.login_bloqueado(text, text) to service_role;
grant execute on function public.registrar_fallo_login(text, text) to service_role;
grant execute on function public.limpiar_fallos_login(text) to service_role;
