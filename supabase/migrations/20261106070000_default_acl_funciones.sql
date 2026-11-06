-- El default global de Postgres da EXECUTE a PUBLIC en funciones nuevas. Un revoke "in schema"
-- no lo quita (los ACL por esquema solo suman); hay que revocar sin "in schema".
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- PROBE DE TEST (tests/db/rls.test.ts): sin grants/revokes a propósito, prueba que lo nuevo nace cerrado.
create function public._probe_default_acl() returns int language sql as 'select 1';
