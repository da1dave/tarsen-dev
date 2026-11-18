import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATALOGO } from '../../templates/catalogo'
import Escribir from '../../components/Escribir'
import Icono from '../../components/Iconos'
import TarjetaPlantilla from '../templates/TarjetaPlantilla'
import TarjetaProyecto from '../projects/TarjetaProyecto'
import { listarProyectos, type Proyecto } from '../../lib/proyectos'
import { useAuth } from '../../auth/AuthContext'
import styles from '../shared/Pagina.module.css'

export default function Inicio() {
  // 0: escribe el titular · 1: escribe el texto de abajo. Las plantillas se ven desde el principio.
  const [fase, setFase] = useState(0)
  const [recientes, setRecientes] = useState<Proyecto[]>([])
  const { usuario } = useAuth()
  const [saludo] = useState(() => (usuario?.nombre ? `Hola, ${usuario.nombre.split(' ')[0]}. Lancemos tu negocio.` : 'Elige tu plantilla y lancemos tu negocio.'))

  useEffect(() => {
    listarProyectos().then((l) => setRecientes(l.slice(0, 3))).catch(() => setRecientes([]))
  }, [])

  return (
    <div className={styles.pagina}>
      <header className={styles.intro}>
        <Escribir etiqueta="h1" className={styles.saludo} texto={saludo} ms={45} activo onFin={() => setFase((f) => Math.max(f, 1))} />
        <Escribir className={styles.sub} texto="Nuestra IA la llena con los datos de tu negocio y tú ves cómo queda antes de publicar." ms={22} activo={fase >= 1} ultimo />
      </header>

      <section aria-labelledby="h-proy">
        <div className={styles.cab}>
          <h2 id="h-proy">Tus proyectos recientes</h2>
          <Link to="/app/proyectos">Ver todos <Icono n="flecha" /></Link>
        </div>
        {recientes.length ? (
          <div className={styles.rejilla}>
            {recientes.map((p) => <TarjetaProyecto key={p.id} p={p} />)}
          </div>
        ) : (
          <div className={styles.sinProyectos}>
            <p>Aún no tienes proyectos. Elige una plantilla de abajo y pulsa "Editar plantilla" para empezar.</p>
            <Link to="/app/plantillas" className={styles.btn}>Elegir plantilla</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="h-plant">
        <div className={styles.cab}>
          <h2 id="h-plant">Plantillas</h2>
          <Link to="/app/plantillas">Ver todas <Icono n="flecha" /></Link>
        </div>
        <div className={styles.rejilla}>
          {CATALOGO.map((p) => <TarjetaPlantilla key={p.id} p={p} />)}
        </div>
      </section>
    </div>
  )
}
