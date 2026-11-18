-- Publicación de la página de un cliente en /s/<slug>.
-- Al publicar se guarda una copia (datos_publicados): el usuario puede seguir editando sin que
-- los visitantes vean cambios a medias, hasta que pulse "Actualizar publicación".
-- Los visitantes (sin sesión) solo pueden leer esa copia, a través de pagina_publica().

alter table public.proyectos
  add column slug text unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  add column datos_publicados jsonb,
  add column publicado_en timestamptz;

-- El navegador no puede cambiar estas columnas directamente (solo nombre y datos, ver la migración
-- anterior): se cambian con las funciones de abajo, que revisan que el proyecto sea del usuario.

create function public.publicar_proyecto(p_id uuid, p_slug text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  limpio text := lower(trim(p_slug));
begin
  if auth.uid() is null then raise exception 'sin sesión' using errcode = '42501'; end if;
  if limpio !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(limpio) not between 3 and 40 then
    raise exception 'slug inválido' using errcode = '22023';
  end if;
  if limpio in ('app', 'admin', 'api', 'login', 'registro', 'vista', 'tarsen', 'www', 'soporte', 'ayuda') then
    raise exception 'slug reservado' using errcode = '23505';
  end if;
  update public.proyectos
    set slug = limpio, datos_publicados = datos, estado = 'publicado', publicado_en = now()
    where id = p_id and usuario_id = auth.uid();
  if not found then raise exception 'proyecto no encontrado' using errcode = 'P0002'; end if;
  return limpio;
end $$;

-- Despublicar conserva el slug (así puede volver a publicar en la misma dirección).
create function public.despublicar_proyecto(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.proyectos
    set estado = 'borrador', datos_publicados = null, publicado_en = null
    where id = p_id and usuario_id = auth.uid();
  if not found then raise exception 'proyecto no encontrado' using errcode = 'P0002'; end if;
end $$;

-- Lo único que ven los visitantes: la plantilla, el nombre y la copia publicada.
create function public.pagina_publica(p_slug text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('plantilla', plantilla, 'nombre', nombre, 'datos', datos_publicados)
  from public.proyectos
  where slug = lower(p_slug) and estado = 'publicado' and datos_publicados is not null;
$$;

revoke all on function public.publicar_proyecto(uuid, text) from public, anon;
revoke all on function public.despublicar_proyecto(uuid) from public, anon;
revoke all on function public.pagina_publica(text) from public;
grant execute on function public.publicar_proyecto(uuid, text) to authenticated;
grant execute on function public.despublicar_proyecto(uuid) to authenticated;
grant execute on function public.pagina_publica(text) to anon, authenticated;
