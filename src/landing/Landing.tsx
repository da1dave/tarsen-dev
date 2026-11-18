import type { ReactNode } from 'react'
import Navbar from '../components/Navbar/Navbar'
import { usePestanas } from '../components/usePestanas'
import { IDS_PESTANAS, type IdPestana } from './pestanas'
import Hero from './Hero/Hero'
import Services from './Services/Services'
import About from './About/About'
import Footer from './Footer/Footer'

function vista(id: IdPestana): ReactNode {
  if (id === 'que-hacemos') return <><Services /><Footer /></>
  if (id === 'quienes-somos') return <><About /><Footer /></>
  return <Hero />
}

export default function Landing() {
  const { activa, mostrada } = usePestanas(IDS_PESTANAS)
  return (
    <>
      <Navbar activa={activa} />
      <main>{vista(mostrada)}</main>
    </>
  )
}
