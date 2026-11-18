export interface PlantillaCatalogo {
  id: string
  nombre: string
  categoria: string
  descripcion: string
  imagen: string // figura sobre el fondo de la tarjeta ('' = solo el fondo)
  fondo: string
  disponible: boolean
}

export const CATEGORIAS = ['Todas', 'Negocios', 'Comida', 'Tienda', 'Servicios', 'Salud']

export const CATALOGO: PlantillaCatalogo[] = [
  { id: 'orbita', nombre: 'Órbita', categoria: 'Negocios', descripcion: 'Héroe animado, servicios, historia y contacto.', imagen: '/img/planeta_anillos.png', fondo: '/img/espacio_2.jpg', disponible: true },
  { id: 'manta', nombre: 'Manta', categoria: 'Portafolio', descripcion: 'Página clara con galería de efecto tela y el logo que sigue al cursor.', imagen: '', fondo: '/img/manta_miniatura.jpg', disponible: true },
  { id: 'aurea', nombre: 'Áurea', categoria: 'Restaurantes', descripcion: 'Elegante y dorada: textos que aparecen desde la niebla y scroll suave.', imagen: '', fondo: '/img/aurea/fondo.jpg', disponible: true },
  { id: 'cometa', nombre: 'Cometa', categoria: 'Comida', descripcion: 'Para restaurantes y cafés: menú y ubicación.', imagen: '/img/celular.png', fondo: '/img/espacio_3.jpg', disponible: false },
  { id: 'nebulosa', nombre: 'Nebulosa', categoria: 'Tienda', descripcion: 'Catálogo de productos y botón de compra.', imagen: '/img/planeta_roca.png', fondo: '/img/espacio_4.jpg', disponible: false },
]
