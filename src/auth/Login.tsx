import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabaseConfigurado } from '../lib/supabase'
import Navbar from '../components/Navbar/Navbar'
import styles from './Auth.module.css'

export default function Login() {
  const { iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const correo = String(f.get('correo')).trim()
    const clave = String(f.get('clave'))
    if (!correo || clave.length < 8) { setError('Escribe tu correo y una contraseña de mínimo 8 caracteres.'); return }
    setEnviando(true)
    setError('')
    const fallo = await iniciarSesion(correo, clave)
    setEnviando(false)
    if (fallo) { setError(fallo); return }
    navegar('/app')
  }

  return (
    <>
      <Navbar activa="inicio" />
      <main className={styles.pagina}>
        <form className={styles.tarjeta} onSubmit={enviar} noValidate>
          <h1 className="titular">iniciar sesión</h1>
          <p className={styles.sub}>Entra para ver tus plantillas.</p>
          <label className={styles.campo}>Correo<input name="correo" type="email" autoComplete="email" required /></label>
          <label className={styles.campo}>Contraseña<input name="clave" type="password" autoComplete="current-password" required /></label>
          {!supabaseConfigurado && <p className={styles.error} role="alert">Falta conectar Supabase: crea el archivo .env.local (ver .env.example).</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.btn} type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          <p className={styles.alt}>¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
        </form>
      </main>
    </>
  )
}
