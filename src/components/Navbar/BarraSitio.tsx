import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Pestana } from '../usePestanas'
import styles from './Navbar.module.css'
import tabs from './Tabs.module.css'

interface Props {
  inicio: string // a dónde lleva el logo
  logo?: string
  nombre: string
  pestanas: Pestana[]
  activa: string
  accion?: ReactNode // botón a la derecha
}

/* Barra superior de un sitio con pestañas: la usan la landing de Tarsen y las plantillas. */
export default function BarraSitio({ inicio, logo, nombre, pestanas, activa, accion }: Props) {
  return (
    <header className={styles.nav}>
      <Link to={inicio.startsWith('#') ? { hash: inicio } : inicio} state={{ transicion: true }} className={styles.marca} aria-label={`${nombre}, inicio`}>
        {logo && <img src={logo} alt="" />}
        <span>{nombre}</span>
      </Link>
      <nav aria-label="Secciones" className={tabs.tabs}>
        {pestanas.map((p) => (
          <Link key={p.id} to={p.to.startsWith('#') ? { hash: p.to } : p.to} state={{ transicion: true }} className={tabs.tab} aria-current={p.id === activa ? 'page' : undefined}>
            {p.texto}
          </Link>
        ))}
      </nav>
      {accion}
    </header>
  )
}
