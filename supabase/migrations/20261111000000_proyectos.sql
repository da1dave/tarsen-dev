-- Proyectos de los usuarios, historial del chat con nuestra IA y fotos.
-- Seguridad: con RLS cada usuario solo ve y edita lo suyo. Los mensajes del chat y el contador
-- de mensajes solo los escribe la función chat-plantilla (con la service role, que no pasa por RLS).

-- ---------- Proyectos ----------
create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plantilla text not null,
  nombre text not null default 'Mi proyecto',
  datos jsonb not null,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  mensajes_usados integer not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index proyectos_usuario_idx on public.proyectos (usuario_id, actualizado desc);

alter table public.proyectos enable row level security;
create policy "ver mis proyectos" on public.proyectos for select using (auth.uid() = usuario_id);
create policy "crear mis proyectos" on public.proyectos for insert with check (auth.uid() = usuario_id);
create policy "editar mis proyectos" on public.proyectos for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "borrar mis proyectos" on public.proyectos for delete using (auth.uid() = usuario_id);

-- Permisos explícitos (funcionan aunque "Automatically expose new tables" esté apagado).
-- Solo usuarios con sesión; las políticas de arriba limitan cada fila a su dueño.
revoke all on public.proyectos from anon, authenticated;
grant select, insert, delete on public.proyectos to authenticated;
-- Desde el navegador solo se pueden cambiar el nombre y los datos; el estado (publicar requiere plan)
-- y el contador de mensajes los cambia el servidor.
grant update (nombre, datos) on public.proyectos to authenticated;

create function public.marcar_actualizado() returns trigger language plpgsql as $$
begin
  new.actualizado = now();
  return new;
end $$;
create trigger proyectos_actualizado before update on public.proyectos
  for each row execute function public.marcar_actualizado();

-- ---------- Mensajes del chat ----------
create table public.mensajes (
  id bigint generated always as identity primary key,
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  rol text not null check (rol in ('usuario', 'asistente')),
  contenido jsonb not null, -- formato propio: { texto, cambios? }, independiente del proveedor de IA
  proveedor text,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  creado timestamptz not null default now()
);
create index mensajes_proyecto_idx on public.mensajes (proyecto_id, id);

alter table public.mensajes enable row level security;
revoke all on public.mensajes from anon, authenticated;
grant select on public.mensajes to authenticated; -- solo lectura: los escribe la función chat-plantilla
create policy "ver mensajes de mis proyectos" on public.mensajes for select
  using (exists (select 1 from public.proyectos p where p.id = proyecto_id and p.usuario_id = auth.uid()));

-- ---------- Fotos ----------
-- Lectura pública (las páginas publicadas las muestran); subir y borrar solo en la carpeta propia:
-- fotos/<usuario_id>/<proyecto_id>/<archivo>
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict (id) do nothing;
create policy "subir mis fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar mis fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
