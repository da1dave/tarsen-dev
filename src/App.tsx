import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Landing from './landing/Landing'
import Login from './auth/Login'
import Registro from './auth/Registro'
import AppShell from './app/layout/AppShell'
import Inicio from './app/home/Inicio'
import PlantillasLista from './app/templates/PlantillasLista'
import PlantillaVista from './app/templates/PlantillaVista'
import Pronto from './app/shared/Pronto'
import Perfil from './app/perfil/Perfil'
import VistaPlantilla from './app/templates/VistaPlantilla'
import ListaProyectos from './app/projects/ListaProyectos'
import Editor from './app/projects/Editor'
import VistaProyecto from './app/projects/VistaProyecto'
import PaginaPublica from './publica/PaginaPublica'
import type { ReactElement } from 'react'

function Privada({ children }: { children: ReactElement }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <div style={{ minHeight: '100svh', background: '#0b0b0e' }} aria-busy="true" />
  return usuario ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/app" element={<Privada><AppShell /></Privada>}>
        <Route index element={<Inicio />} />
        <Route path="plantillas" element={<PlantillasLista />} />
        <Route path="plantillas/:id" element={<PlantillaVista />} />
        <Route path="proyectos" element={<ListaProyectos />} />
        <Route path="proyectos/:id" element={<Editor />} />
        <Route path="notificaciones" element={<Pronto titulo="notificaciones" texto="Aquí te avisaremos cuando tu proyecto avance, nuestra IA termine o el equipo responda. Todavía no tienes avisos." />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="ia" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="/vista/proyecto/:pid" element={<Privada><VistaProyecto /></Privada>} />
      <Route path="/vista/:id/:modo" element={<Privada><VistaPlantilla /></Privada>} />
      <Route path="/s/:slug" element={<PaginaPublica />} />
      <Route path="/plantillas" element={<Navigate to="/app/plantillas" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
