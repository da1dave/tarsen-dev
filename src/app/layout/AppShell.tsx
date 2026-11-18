import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Icono, { type NombreIcono } from '../../components/Iconos'
import styles from './AppShell.module.css'

const ITEMS: { to: string; texto: string; icono: NombreIcono; fin?: boolean }[] = [
  { to: '/app', texto: 'Inicio', icono: 'inicio', fin: true },
  { to: '/app/proyectos', texto: 'Proyectos', icono: 'proyectos' },
  { to: '/app/plantillas', texto: 'Plantillas', icono: 'plantillas' },
  { to: '/app/ia', texto: 'Tarsen IA', icono: 'ia' },
]

export default function AppShell() {
  const { usuario, salir } = useAuth()
  const navegar = useNavigate()

  return (
    <div className={`tema-panel ${styles.app}`}>
      <aside className={styles.lateral}>
        <Link to="/" className={styles.marca} aria-label="Tarsen Dev, página principal">
          <img src="/img/logo_tarsen_blanco.png" alt="" />
          <span>tarsen dev.</span>
        </Link>
        <nav aria-label="Aplicación" className={styles.menu}>
          {ITEMS.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.fin} className={styles.item}>
              <Icono n={it.icono} />
              <span>{it.texto}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.cuenta}>
          <NavLink to="/app/notificaciones" className={styles.item}>
            <Icono n="campana" />
            <span>Notificaciones</span>
          </NavLink>
          <NavLink to="/app/perfil" className={styles.item} title={usuario?.correo}>
            <Icono n="usuario" />
            <span>{usuario?.nombre || 'Perfil'}</span>
          </NavLink>
        </div>
        <div className={styles.pie}>
          <button type="button" className={styles.btn} onClick={async () => { await salir(); navegar('/') }} aria-label={`Cerrar sesión de ${usuario?.nombre ?? ''}`}>
            <Icono n="salir" />
            <span>Salir</span>
          </button>
        </div>
      </aside>
      <main className={`resplandor ${styles.contenido}`}>
        <Outlet />
      </main>
    </div>
  )
}
