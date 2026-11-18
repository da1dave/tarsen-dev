import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  aSlug, cambiosSinPublicar, despublicarProyecto, publicarProyecto, urlPublica, type Proyecto,
} from '../../lib/proyectos'
import { tieneEjemplos } from '../../templates/visibilidad'
import styles from './PanelPublicar.module.css'

/*
 * Botón "Publicar" del editor y su ventana: elegir la dirección (/s/<slug>), publicar,
 * actualizar la publicación con los cambios nuevos o despublicar.
 */
export default function PanelPublicar({ proyecto, cambiar }: { proyecto: Proyecto; cambiar: (p: Partial<Proyecto>) => void }) {
  const ventana = useRef<HTMLDialogElement>(null)
  const sugerido = () => proyecto.slug ?? aSlug(proyecto.datos.nombre.includes('→') ? proyecto.nombre : proyecto.datos.nombre)
  const [slug, setSlug] = useState(sugerido)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)

  const publicado = proyecto.estado === 'publicado'
  const pendiente = cambiosSinPublicar(proyecto)
  const ejemplos = tieneEjemplos(proyecto.datos)
  const limpio = aSlug(slug)
  const cambioDireccion = publicado && limpio !== proyecto.slug

  useEffect(() => { if (!copiado) return; const t = setTimeout(() => setCopiado(false), 2000); return () => clearTimeout(t) }, [copiado])

  const abrir = () => { setSlug(sugerido()); setError(''); ventana.current?.showModal() }

  const publicar = async (e?: FormEvent) => {
    e?.preventDefault()
    if (ocupado || limpio.length < 3) return
    setOcupado(true)
    setError('')
    try {
      const final = await publicarProyecto(proyecto.id, limpio)
      const ahora = new Date().toISOString()
      setSlug(final)
      cambiar({ estado: 'publicado', slug: final, publicado_en: ahora, actualizado: ahora })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos publicar tu página.')
    } finally {
      setOcupado(false)
    }
  }

  const despublicar = async () => {
    setOcupado(true)
    setError('')
    try {
      await despublicarProyecto(proyecto.id)
      cambiar({ estado: 'borrador', publicado_en: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos despublicar tu página.')
    } finally {
      setOcupado(false)
    }
  }

  const copiar = async () => {
    try { await navigator.clipboard.writeText(urlPublica(proyecto.slug!)); setCopiado(true) } catch { /* sin permiso: el enlace sigue visible */ }
  }

  return (
    <>
      <button type="button" className={`${styles.boton} ${publicado ? styles.publicado : ''}`} onClick={abrir}>
        {!publicado ? 'Publicar' : pendiente ? 'Actualizar publicación' : '✓ Publicada'}
        {pendiente && <span className={styles.punto} aria-label="(hay cambios sin publicar)" />}
      </button>

      <dialog ref={ventana} className={styles.ventana} aria-labelledby="titulo-publicar" onClick={(e) => { if (e.target === ventana.current) ventana.current?.close() }}>
        <form className={styles.contenido} onSubmit={publicar}>
          <header>
            <h2 id="titulo-publicar">{publicado ? 'Tu página está publicada' : 'Publica tu página'}</h2>
            <button type="button" className={styles.cerrar} onClick={() => ventana.current?.close()} aria-label="Cerrar">✕</button>
          </header>

          {publicado && proyecto.slug && (
            <div className={styles.enlace}>
              <a href={urlPublica(proyecto.slug)} target="_blank" rel="noreferrer">{urlPublica(proyecto.slug).replace(/^https?:\/\//, '')} ↗</a>
              <button type="button" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar enlace'}</button>
            </div>
          )}
          {publicado && (
            <p className={pendiente ? styles.alerta : styles.nota}>
              {pendiente
                ? 'Hiciste cambios después de publicar. Tus visitantes aún ven la versión anterior hasta que actualices.'
                : 'Tus visitantes ven la última versión. Si editas algo, vuelve aquí para actualizar la publicación.'}
            </p>
          )}

          <label className={styles.campo}>
            Dirección de tu página
            <div className={styles.direccion}>
              <span>{window.location.host}/s/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); setError('') }}
                onBlur={() => setSlug(limpio)}
                maxLength={40}
                placeholder="mi-negocio"
                spellCheck={false}
                autoComplete="off"
                required
              />
            </div>
            <small>Letras sin tildes, números y guiones. Por ejemplo: cafe-luna.</small>
          </label>

          {ejemplos && (
            <p className={styles.alerta}>
              Tu página aún tiene textos de ejemplo («→ acá va… ←»). Complétalos con Tarsen o con la edición detallada antes de publicar, o publícala así y actualízala después.
            </p>
          )}
          {cambioDireccion && <p className={styles.nota}>Al cambiar la dirección, el enlace anterior dejará de funcionar.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.acciones}>
            {publicado && (
              <button type="button" className={styles.secundario} onClick={despublicar} disabled={ocupado}>Despublicar</button>
            )}
            <button type="submit" className={styles.principal} disabled={ocupado || limpio.length < 3 || (publicado && !pendiente && !cambioDireccion)}>
              {ocupado ? 'Un momento…' : !publicado ? 'Publicar' : cambioDireccion ? 'Cambiar dirección' : 'Actualizar publicación'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
