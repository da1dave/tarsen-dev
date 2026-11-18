import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { borrarProyecto, listarProyectos, type Proyecto } from '../../lib/proyectos'
import pagina from '../shared/Pagina.module.css'
import styles from './Proyectos.module.css'
import TarjetaProyecto from './TarjetaProyecto'

/* Historial de proyectos del usuario (guardados en Supabase). */
export default function ListaProyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listarProyectos().then(setProyectos).catch(() => setError('No pudimos cargar tus proyectos. Revisa tu conexión e intenta de nuevo.'))
  }, [])

  const borrar = async (p: Proyecto) => {
    if (!window.confirm(`¿Borrar "${p.nombre}"? Se perderán sus datos y la conversación con nuestra IA.`)) return
    try {
      await borrarProyecto(p.id)
      setProyectos((lista) => lista?.filter((x) => x.id !== p.id) ?? null)
    } catch {
      setError('No pudimos borrar el proyecto. Intenta de nuevo.')
    }
  }

  return (
    <div className={pagina.pagina}>
      <header>
        <h1 className={pagina.titulo}>Mis proyectos</h1>
        <p className={pagina.vacio} style={{ marginTop: 8 }}>Tus landings, con lo que nuestra IA y tú han armado. Se guardan solas.</p>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {proyectos === null && !error && <p className={pagina.vacio}>Cargando…</p>}
      {proyectos?.length === 0 && (
        <div className={pagina.sinProyectos}>
          <p>Aún no tienes proyectos. Elige una plantilla y pulsa "Editar plantilla" para empezar.</p>
          <Link to="/app/plantillas" className={pagina.btn}>Elegir plantilla</Link>
        </div>
      )}
      {!!proyectos?.length && (
        <div className={pagina.rejilla}>
          {proyectos.map((p) => <TarjetaProyecto key={p.id} p={p} onBorrar={borrar} />)}
        </div>
      )}
    </div>
  )
}
