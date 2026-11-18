import type { Diapositiva } from '../../components/Carrusel/Carrusel'

export const WHATSAPP = 'https://wa.me/573000000000'

export const SLIDES: Diapositiva[] = [
  {
    titulo: 'Haz memorable tu marca',
    texto: 'Diseño excepcional para tu marca, impulsado por nuestra IA.',
    boton: 'Ver más', href: '/#que-hacemos',
    img: '/img/logo_tarsen_metalico.png', alt: 'Mascota de Tarsen Dev flotando en el espacio',
    figura: 'logo', fondo: '/img/espacio_1.jpg',
  },
  {
    titulo: 'Tu negocio, en órbita',
    texto: 'Nos das tu logo, tus fotos y tus datos; la plantilla pone cada cosa en su lugar.',
    boton: 'Conócenos', href: '/#quienes-somos',
    img: '/img/planeta_anillos.png', alt: 'Planeta con anillos',
    figura: 'anillos', fondo: '/img/espacio_2.jpg',
  },
  {
    titulo: 'Lista para cualquier pantalla',
    texto: 'Se ve impecable en celular, tablet y computador.',
    boton: 'Ver servicios', href: '/#que-hacemos',
    img: '/img/celular.png', alt: 'Celular mostrando una landing de ejemplo',
    figura: 'celular', fondo: '/img/espacio_3.jpg',
  },
  {
    titulo: 'Que te recuerden',
    texto: 'Crea tu cuenta gratis y mira tu página con los datos de tu negocio.',
    boton: 'Prueba la app', href: '/registro',
    img: '/img/planeta_roca.png', alt: 'Planeta rocoso',
    figura: 'roca', fondo: '/img/espacio_4.jpg',
  },
]
