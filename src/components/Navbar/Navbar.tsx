import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PESTANAS, type IdPestana } from '../../landing/pestanas'
import BarraSitio from './BarraSitio'
import styles from './Navbar.module.css'

/* Barra de la landing de Tarsen. */
export default function Navbar({ activa }: { activa: IdPestana }) {
  const { usuario } = useAuth()
  return (
    <BarraSitio
      inicio="/"
      logo="/img/logo_tarsen_blanco.png"
      nombre="tarsen dev."
      pestanas={PESTANAS}
      activa={activa}
      accion={
        <Link to={usuario ? '/app' : '/login'} className={styles.btn}>
          {usuario ? 'Ir a la app' : 'Iniciar sesión'}
        </Link>
      }
    />
  )
}
