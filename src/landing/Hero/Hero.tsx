import Carrusel from '../../components/Carrusel/Carrusel'
import { SLIDES, WHATSAPP } from './slides'

export default function Hero() {
  return <Carrusel slides={SLIDES} titulo="Tarsen Dev, landing pages para negocios pequeños" whatsapp={WHATSAPP} />
}
