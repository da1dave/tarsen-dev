import { useEffect, useRef, type RefObject } from 'react'
import {
  CanvasTexture, DoubleSide, Mesh, PerspectiveCamera, PlaneGeometry, SRGBColorSpace,
  Scene, ShaderMaterial, Vector2, WebGLRenderer,
} from 'three'
import { pintar } from './pintar'
import styles from './PlantillaManta.module.css'

/*
 * Efecto "manta" (inspirado en unseen.co/projects) para toda la página.
 * Cada elemento con [data-bloque] (tarjetas con su título, encabezados, bloques de texto) se copia
 * a una imagen (pintar.ts) y se dibuja con WebGL sobre una malla que se comporta como tela:
 *  - Al hacer scroll se arquea según la velocidad (inercia).
 *  - Cerca del borde superior hay una línea de pliegue: lo que la cruza se dobla hacia atrás y hacia
 *    arriba, alejándose, como en Unseen. Lo que está debajo de la línea queda plano.
 *  - Al pasar el mouse, el bloque se levanta un poco.
 * El HTML original queda invisible (opacity 0) pero sigue recibiendo clics, foco y lectores de pantalla.
 * Sin WebGL o con "reducir movimiento" no se activa y la página se ve normal.
 */

const VERTICES = /* glsl */ `
  uniform vec2 uSize;
  uniform float uPliegue;
  uniform float uVel;
  uniform float uHover;
  varying vec2 vUv;
  varying float vSombra;
  const float PI = 3.141592653589793;

  void main() {
    vUv = uv;
    vec3 p = vec3(position.x * uSize.x, position.y * uSize.y, 0.0);

    // Inercia del scroll: la tela se arquea y el centro se queda un poco atrás.
    p.z += (sin(uv.x * PI) * 0.7 + sin(uv.y * PI) * 0.3) * uVel * 70.0;
    p.y += sin(uv.x * PI) * uVel * 10.0;

    // Hover: se levanta suavemente desde el centro.
    p.z += sin(uv.x * PI) * sin(uv.y * PI) * uHover * 40.0;

    // Pliegue hacia atrás: por encima de la línea (uPliegue, en píxeles desde el centro) la tela gira
    // sobre un cilindro alejándose de la cámara y, pasado el ángulo máximo, sigue recta hacia arriba y atrás.
    float radio = max(min(uSize.y, 600.0) * 0.22, 1.0);
    float maximo = PI * 0.3;
    float sombra = 0.0;
    if (p.y > uPliegue) {
      float arco = p.y - uPliegue;
      float giro = arco / radio;
      if (giro < maximo) {
        p.y = uPliegue + radio * sin(giro);
        p.z -= radio * (1.0 - cos(giro));
      } else {
        float resto = arco - radio * maximo;
        p.y = uPliegue + radio * sin(maximo) + resto * cos(maximo);
        p.z -= radio * (1.0 - cos(maximo)) + resto * sin(maximo);
      }
      sombra = clamp(giro / maximo, 0.0, 1.0);
    }
    vSombra = sombra;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const FRAGMENTOS = /* glsl */ `
  uniform sampler2D uTex;
  varying vec2 vUv;
  varying float vSombra;

  void main() {
    vec4 color = texture2D(uTex, vUv);
    color.rgb *= 1.0 - 0.3 * vSombra;
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`

const LINEA_PLIEGUE = 0.2 // a qué altura de la ventana (fracción) empieza a doblarse la tela
const DIST = 1000 // distancia de la cámara: 1 unidad = 1 píxel en el plano z = 0

function hayWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

export default function LienzoManta({ raiz, version }: { raiz: RefObject<HTMLElement | null>; version?: unknown }) {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const contenedor = raiz.current
    if (!contenedor || !lienzo.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !hayWebGL()) return

    let vivo = true
    let raf = 0
    let repintado = 0
    const bloques = Array.from(contenedor.querySelectorAll<HTMLElement>('[data-bloque]'))
    const encima = bloques.map(() => 0)
    const entra = bloques.map((_, k) => () => { encima[k] = 1 })
    const sale = bloques.map((_, k) => () => { encima[k] = 0 })
    bloques.forEach((b, k) => { b.addEventListener('pointerenter', entra[k]); b.addEventListener('pointerleave', sale[k]) })

    const renderer = new WebGLRenderer({ canvas: lienzo.current, antialias: true, alpha: true })
    const escala = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(escala)
    const escena = new Scene()
    const camara = new PerspectiveCamera(50, 1, 10, 6000)
    camara.position.z = DIST
    const geometria = new PlaneGeometry(1, 1, 48, 48)

    const mallas = bloques.map(() => {
      const material = new ShaderMaterial({
        vertexShader: VERTICES,
        fragmentShader: FRAGMENTOS,
        side: DoubleSide,
        transparent: true,
        premultipliedAlpha: true,
        uniforms: {
          uTex: { value: null as CanvasTexture | null },
          uSize: { value: new Vector2(1, 1) },
          uPliegue: { value: 1e5 },
          uVel: { value: 0 },
          uHover: { value: 0 },
        },
      })
      const malla = new Mesh(geometria, material)
      // El shader agranda la malla a su tamaño real: three.js no puede saber su tamaño y, si la
      // descartara por estar "fuera de cámara", desaparecería mientras sigue visible en pantalla.
      malla.frustumCulled = false
      malla.visible = false
      escena.add(malla)
      return malla
    })

    // Copia cada bloque a su textura (al inicio y cuando cambia el tamaño de la ventana).
    const pintarTodo = async () => {
      await document.fonts.ready
      const lienzos = await Promise.all(bloques.map((b) => pintar(b, escala)))
      if (!vivo) return
      lienzos.forEach((c, k) => {
        const textura = new CanvasTexture(c)
        textura.colorSpace = SRGBColorSpace
        textura.premultiplyAlpha = true
        textura.anisotropy = renderer.capabilities.getMaxAnisotropy()
        const u = mallas[k].material.uniforms
        u.uTex.value?.dispose()
        u.uTex.value = textura
        bloques[k].dataset.pintado = ''
      })
    }

    const ajustar = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h, false)
      camara.aspect = w / h
      camara.fov = (2 * Math.atan(h / 2 / DIST) * 180) / Math.PI
      camara.updateProjectionMatrix()
    }
    const alCambiarTamano = () => {
      ajustar()
      window.clearTimeout(repintado)
      repintado = window.setTimeout(pintarTodo, 250)
    }
    ajustar()
    window.addEventListener('resize', alCambiarTamano)

    // Velocidad del scroll en px/s, suavizada en el tiempo (igual a 30 o a 144 cuadros por segundo).
    let ultimoY = window.scrollY
    let ultimoT = performance.now()
    let velocidad = 0
    const cuadro = (t = performance.now()) => {
      const y = window.scrollY
      const dt = Math.max(1, t - ultimoT)
      velocidad += ((y - ultimoY) / dt * 1000 - velocidad) * (1 - Math.exp(-dt / 140))
      ultimoY = y
      ultimoT = t
      const vw = window.innerWidth
      const vh = window.innerHeight
      const linea = vh * LINEA_PLIEGUE
      mallas.forEach((m, k) => {
        const u = m.material.uniforms
        const r = bloques[k].getBoundingClientRect()
        m.position.set(r.left + r.width / 2 - vw / 2, -(r.top + r.height / 2 - vh / 2), 0)
        u.uSize.value.set(r.width, r.height)
        // Altura local de la línea de pliegue; si todo el bloque está debajo, no se dobla nada.
        u.uPliegue.value = Math.min(r.height / 2 + 1, r.top + r.height / 2 - linea)
        u.uVel.value = Math.max(-1, Math.min(1, velocidad / 2600))
        u.uHover.value += (encima[k] - u.uHover.value) * 0.08
        // Se dibuja mientras alguna parte esté cerca de la pantalla (también lo doblado, que queda arriba).
        m.visible = !!u.uTex.value && r.bottom > -vh && r.top < vh * 1.2
      })
      renderer.render(escena, camara)
      raf = requestAnimationFrame(cuadro)
    }

    pintarTodo().then(() => { if (vivo) raf = requestAnimationFrame(cuadro) })

    return () => {
      vivo = false
      cancelAnimationFrame(raf)
      window.clearTimeout(repintado)
      window.removeEventListener('resize', alCambiarTamano)
      bloques.forEach((b, k) => {
        b.removeEventListener('pointerenter', entra[k])
        b.removeEventListener('pointerleave', sale[k])
        delete b.dataset.pintado
      })
      mallas.forEach((m) => { m.material.uniforms.uTex.value?.dispose(); m.material.dispose() })
      geometria.dispose()
      renderer.dispose()
    }
  }, [raiz, version]) // al cambiar los datos se vuelve a copiar cada bloque

  return <canvas ref={lienzo} className={styles.lienzo} aria-hidden="true" />
}
