import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { crearProyecto } from '../../lib/proyectos'
import { PLANTILLAS } from '../../templates/registro'
import styles from './PlantillaVista.module.css'

export default function PlantillaVista() {
  const { id = '' } = useParams()
  const [verEjemplo, setVerEjemplo] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const navegar = useNavigate()
  const plantilla = PLANTILLAS[id]
  if (!plantilla) return <Navigate to="/app/plantillas" replace />

  // Crea un proyecto con esta plantilla (lleno de etiquetas) y abre el editor.
  const editar = async () => {
    setCreando(true)
    setError('')
    try {
      const p = await crearProyecto(id, `Mi landing ${plantilla.nombre}`)
      navegar(`/app/proyectos/${p.id}`)
    } catch {
      setError('No pudimos crear el proyecto. Intenta de nuevo.')
      setCreando(false)
    }
  }

  const src = `/vista/${id}/${verEjemplo ? 'ejemplo' : 'etiquetas'}`
  return (
    <div className={styles.vista}>
      <header className={styles.barra}>
        <Link to="/app/plantillas" className={styles.volver}>← Plantillas</Link>
        <strong className={styles.usuario}>Plantilla {plantilla.nombre}</strong>
        <div className={styles.seg} role="group" aria-label="Ver con etiquetas o con ejemplo">
          <button type="button" aria-pressed={!verEjemplo} onClick={() => setVerEjemplo(false)}>Con etiquetas</button>
          <button type="button" aria-pressed={verEjemplo} onClick={() => setVerEjemplo(true)}>Ejemplo</button>
        </div>
        <a className={styles.abrir} href={src} target="_blank" rel="noreferrer">Abrir en pestaña nueva ↗</a>
        {error && <span className={styles.error} role="alert">{error}</span>}
        <button type="button" className={styles.editar} onClick={editar} disabled={creando}>{creando ? 'Creando…' : 'Editar plantilla'}</button>
      </header>
      {/* key: al cambiar de modo, la vista previa se recarga desde el inicio. */}
      <iframe key={src} src={src} title={`Vista previa de la plantilla ${plantilla.nombre}`} className={styles.marco} />
    </div>
  )
}
