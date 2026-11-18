import Carrusel, { type Diapositiva } from '../../components/Carrusel/Carrusel'
import { esWeb, FONDOS, SitioPlantilla } from '../compartido/Secciones'
import type { DatosPlantilla } from '../tipos'

/*
 * Plantilla Órbita: el diseño de la landing de Tarsen. Portada con carrusel
 * (zoom lento y avance automático) sobre fondos de espacio.
 */
export default function PlantillaOrbita({ datos: d }: { datos: DatosPlantilla }) {
  const slides: Diapositiva[] = d.slides.map((s, k) => ({
    titulo: s.titulo,
    texto: s.texto,
    boton: s.boton,
    href: s.href,
    img: s.imagen,
    etiquetaFoto: s.fotoEtiqueta,
    editable: `slides.${s._i ?? k}`,
    alt: '',
    figura: 'foto',
    fondo: FONDOS[k % FONDOS.length],
  }))
  return <SitioPlantilla d={d} portada={<Carrusel slides={slides} titulo={d.nombre} whatsapp={esWeb(d.waHref) ? d.waHref : undefined} />} />
}
