import { useEffect, useRef, useState, type MutableRefObject } from 'react'

/*
 * Lienzo de Marea: dibuja la escena de cada destacado a pantalla completa y, al hacer scroll,
 * la siguiente entra como agua que sube: frente ondulado, refracción, espuma y brillo iridiscente.
 * Una escena es la foto del destacado o, si no tiene, un degradado líquido con los colores de la marca.
 * Si la imagen tiene transparencia (un logo PNG), flota sobre el líquido y ondula como bajo el agua.
 * WebGL 1 sin librerías. Si el navegador no tiene WebGL se muestran las escenas con CSS.
 */

export interface Escena { imagen: string; colores: [string, string, string] }

/** `progreso`: posición en escenas (1.4 = 40 % de la transición de la escena 1 a la 2). */
/** `alAvanzar` recibe en cada cuadro el progreso que se está dibujando (el del agua, con su retardo). */
interface Props { escenas: Escena[]; progreso: MutableRefObject<number>; quieto: boolean; className?: string; alAvanzar?: (p: number) => void }

const VERTICE = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAGMENTO = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime, uMix, uSeed0, uSeed1, uHas0, uHas1, uModo0, uModo1;
uniform vec2 uImg0, uImg1, uMouse;
uniform vec3 uA0, uB0, uC0, uA1, uB1, uC1;
uniform sampler2D uTex0, uTex1;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

// La imagen cubre la pantalla (como background-size: cover).
vec2 cubrir(vec2 uv, vec2 img) {
  float r = uRes.x / uRes.y, ri = img.x / max(img.y, 1.0);
  vec2 s = r > ri ? vec2(1.0, ri / r) : vec2(r / ri, 1.0);
  return (uv - 0.5) * s + 0.5;
}

vec3 liquido(vec2 uv, float seed, vec3 a, vec3 b, vec3 c);

// Logo (imagen con transparencia): flota sobre el líquido, ondula y deja bordes iridiscentes.
vec3 conLogo(vec2 uv, vec3 fondo, sampler2D tex, vec2 img) {
  float asp = uRes.x / uRes.y;
  bool ancho = asp > 1.0;
  vec2 centro = (ancho ? vec2(0.68, 0.53) : vec2(0.5, 0.7)) + vec2(0.0, sin(uTime * 0.6) * 0.012);
  float alto = ancho ? 0.64 : 0.36;
  vec2 q = (uv - centro) * vec2(asp, 1.0) / alto;
  float ri = img.x / max(img.y, 1.0);
  vec2 ola = vec2(fbm(q * 2.6 + uTime * 0.25), fbm(q * 2.6 + 5.0 - uTime * 0.25)) - 0.5;
  vec2 st = vec2(q.x / ri, q.y) + 0.5 + ola * 0.05;
  float dentro = step(0.0, st.x) * step(st.x, 1.0) * step(0.0, st.y) * step(st.y, 1.0);
  vec2 t = vec2(st.x, 1.0 - st.y);
  vec4 l = texture2D(tex, t);
  float rA = texture2D(tex, t + vec2(0.006, 0.0)).a, bA = texture2D(tex, t - vec2(0.006, 0.0)).a;
  float al = l.a * dentro;
  // Halo suave detrás del logo y borde de color (aberración) como luz atravesando agua.
  vec3 col = fondo + exp(-length(q) * 2.2) * 0.12;
  col += vec3(1.0, 0.35, 0.8) * max(rA - l.a, 0.0) * dentro * 0.55 + vec3(0.3, 0.8, 1.0) * max(bA - l.a, 0.0) * dentro * 0.55;
  vec3 iris = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + ola.x * 3.0 + q.y + uTime * 0.08));
  vec3 logo = l.rgb + iris * 0.1 * smoothstep(0.3, 0.9, l.a);
  return mix(col, logo, al);
}

vec3 escena(vec2 uv, float seed, vec3 a, vec3 b, vec3 c, float has, float modo, sampler2D tex, vec2 img) {
  if (has > 0.5 && modo > 0.5) return conLogo(uv, liquido(uv, seed, a, b, c), tex, img);
  if (has > 0.5) {
    vec2 st = cubrir((uv - 0.5) * 0.96 + 0.5 + vec2(sin(uTime * 0.07 + seed), cos(uTime * 0.05 + seed)) * 0.008, img);
    return texture2D(tex, vec2(st.x, 1.0 - st.y)).rgb;
  }
  return liquido(uv, seed, a, b, c);
}

vec3 liquido(vec2 uv, float seed, vec3 a, vec3 b, vec3 c) {
  // Degradado líquido: ruido deformado sobre sí mismo, con los tres colores de la escena.
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y) * 1.5 + seed * 3.7;
  float t = uTime * 0.04;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.6), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 2.6 * r);
  vec3 col = mix(a, b, smoothstep(0.25, 0.75, f));
  col = mix(col, c, smoothstep(0.45, 0.95, length(r)) * 0.85);
  float brillo = pow(0.5 + 0.5 * sin((p.y + f * 1.8) * 22.0 + uTime * 0.3), 14.0);
  return col + brillo * 0.07;
}

void main() {
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  // Ondas suaves alrededor del cursor.
  vec2 dm = (uv - uMouse) * vec2(asp, 1.0);
  float dist = length(dm);
  uv += (dm / max(dist, 0.001)) * sin(dist * 38.0 - uTime * 2.6) * 0.0022 * exp(-dist * 5.0);

  float x = uv.x * asp;
  float onda = sin(uMix * 3.14159);
  float ola = (fbm(vec2(x * 1.7, uTime * 0.22)) - 0.5) * 0.42 + sin(x * 4.6 + uTime * 1.2) * 0.03;
  float frente = mix(-0.3, 1.3, uMix) + ola * onda;
  float d = frente - uv.y; // > 0: bajo el agua (escena nueva)
  float cerca = exp(-abs(d) * 7.0) * onda;

  vec2 grad = vec2(fbm(vec2(x * 5.0, uv.y * 5.0 + uTime * 0.6)), fbm(vec2(x * 5.0 + 7.0, uv.y * 5.0 - uTime * 0.6))) - 0.5;
  float rayas = sin(uv.y * 210.0 + ola * 55.0 + uTime * 3.0);
  vec2 desv = grad * 0.14 * cerca + vec2(rayas * 0.005 * cerca, 0.0);

  vec3 col;
  if (uMix < 0.002) {
    col = escena(uv, uSeed0, uA0, uB0, uC0, uHas0, uModo0, uTex0, uImg0);
  } else if (uMix > 0.998) {
    col = escena(uv, uSeed1, uA1, uB1, uC1, uHas1, uModo1, uTex1, uImg1);
  } else {
    vec3 antes = escena(uv - desv * 0.4, uSeed0, uA0, uB0, uC0, uHas0, uModo0, uTex0, uImg0);
    vec3 nueva = escena(uv + desv, uSeed1, uA1, uB1, uC1, uHas1, uModo1, uTex1, uImg1);
    col = mix(antes, nueva, smoothstep(-0.004, 0.004, d));
    // Brillo iridiscente y espuma en el frente del agua.
    vec3 iris = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + d * 9.0 + x * 0.5 + uTime * 0.1));
    col += iris * cerca * 0.32;
    col += exp(-abs(d) * 85.0) * onda * 0.6;
    col += max(rayas, 0.0) * cerca * 0.05;
  }
  col += (hash(vUv * uRes + fract(uTime)) - 0.5) * 0.025; // grano
  gl_FragColor = vec4(col, 1.0);
}`

const aRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

interface Textura { tex: WebGLTexture; ancho: number; alto: number; listo: boolean; src: string; logo: boolean }

/** ¿La imagen tiene transparencia en su borde? (un logo PNG y no una foto) */
function esLogo(img: HTMLImageElement) {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 24
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, 24, 24)
    const d = ctx.getImageData(0, 0, 24, 24).data
    let transparentes = 0
    for (let i = 0; i < 24; i++) for (const [x, y] of [[i, 0], [i, 23], [0, i], [23, i]]) if (d[(y * 24 + x) * 4 + 3] < 200) transparentes++
    return transparentes > 24
  } catch {
    return false // sin permiso para leer los píxeles: se trata como foto
  }
}

export default function LienzoMarea({ escenas, progreso, quieto, className, alAvanzar }: Props) {
  const avisar = useRef(alAvanzar)
  avisar.current = alAvanzar
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [sinWebgl, setSinWebgl] = useState(false)
  const actuales = useRef(escenas)
  actuales.current = escenas
  const cargar = useRef<(escenas: Escena[]) => void>(() => {})

  useEffect(() => {
    const canvas = lienzo.current!
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
    if (!gl) {
      // Sin WebGL: solo se informa el progreso para que cambien los textos.
      setSinWebgl(true)
      let r = 0
      const seguir = () => { avisar.current?.(progreso.current); r = requestAnimationFrame(seguir) }
      r = requestAnimationFrame(seguir)
      return () => cancelAnimationFrame(r)
    }

    const shader = (tipo: number, codigo: string) => {
      const s = gl.createShader(tipo)!
      gl.shaderSource(s, codigo)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('Marea shader:', gl.getShaderInfoLog(s))
      return s
    }
    const programa = gl.createProgram()!
    gl.attachShader(programa, shader(gl.VERTEX_SHADER, VERTICE))
    gl.attachShader(programa, shader(gl.FRAGMENT_SHADER, FRAGMENTO))
    gl.linkProgram(programa)
    gl.useProgram(programa)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(programa, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(programa, n)
    gl.uniform1i(u('uTex0'), 0)
    gl.uniform1i(u('uTex1'), 1)

    // Texturas de las fotos (se cargan una vez por URL).
    const vacia = (): WebGLTexture => {
      const t = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
      return t
    }
    const negra = vacia()
    const texturas = new Map<string, Textura>()
    cargar.current = (lista) => {
      for (const e of lista) {
        if (!e.imagen || texturas.has(e.imagen)) continue
        const t: Textura = { tex: vacia(), ancho: 1, alto: 1, listo: false, src: e.imagen, logo: false }
        texturas.set(e.imagen, t)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          gl.bindTexture(gl.TEXTURE_2D, t.tex)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          Object.assign(t, { ancho: img.naturalWidth, alto: img.naturalHeight, listo: true, logo: esLogo(img) })
        }
        img.src = e.imagen
      }
    }
    cargar.current(actuales.current)

    const fijarEscena = (k: number, e: Escena | undefined, unidad: number) => {
      const t = e?.imagen ? texturas.get(e.imagen) : undefined
      const [a, b, c] = (e?.colores ?? ['#888888', '#aaaaaa', '#cccccc']).map(aRgb)
      gl.uniform3fv(u(`uA${k}`), a)
      gl.uniform3fv(u(`uB${k}`), b)
      gl.uniform3fv(u(`uC${k}`), c)
      gl.uniform1f(u(`uHas${k}`), t?.listo ? 1 : 0)
      gl.uniform1f(u(`uModo${k}`), t?.logo ? 1 : 0)
      gl.uniform2f(u(`uImg${k}`), t?.ancho ?? 1, t?.alto ?? 1)
      gl.activeTexture(unidad)
      gl.bindTexture(gl.TEXTURE_2D, t?.listo ? t.tex : negra)
    }

    // Tamaño: hasta 1.5 px por punto (1.25 en celulares) para cuidar el rendimiento.
    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.5)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(u('uRes'), canvas.width, canvas.height)
    }
    ajustar()
    const obsTam = new ResizeObserver(ajustar)
    obsTam.observe(canvas)

    const raton = { x: 0.5, y: 0.5, rx: 0.5, ry: 0.5 }
    const mover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      raton.x = (e.clientX - r.left) / r.width
      raton.y = 1 - (e.clientY - r.top) / r.height
    }
    window.addEventListener('pointermove', mover, { passive: true })

    // Solo se dibuja mientras el lienzo está en pantalla.
    let visible = true
    const obsVis = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) pedir() })
    obsVis.observe(canvas)

    let raf = 0
    const inicio = performance.now()
    // El agua sigue al scroll con retardo: aunque el scroll sea rápido, la marea sube despacio.
    // RITMO: cuánto avanza por segundo hacia el scroll (más bajo = más lento). Depende del tiempo, no de los cuadros.
    const RITMO = 1.1
    let suavizado = progreso.current
    let anterior = performance.now()
    const pedir = () => { if (!raf) raf = requestAnimationFrame(dibujar) }
    function dibujar(ahora: number) {
      raf = 0
      if (!visible) return
      const lista = actuales.current
      const objetivo = Math.max(0, Math.min(progreso.current, lista.length - 1))
      const dt = Math.min((ahora - anterior) / 1000, 0.1)
      anterior = ahora
      suavizado += (objetivo - suavizado) * (quieto ? 1 : 1 - Math.exp(-RITMO * dt))
      if (Math.abs(objetivo - suavizado) < 0.0005) suavizado = objetivo
      const p = suavizado
      avisar.current?.(p)
      const i = Math.min(Math.floor(p), Math.max(lista.length - 2, 0))
      const local = p - i
      // La escena se queda quieta un rato y luego entra la siguiente.
      const mezcla = lista.length > 1 ? Math.min(1, Math.max(0, (local - 0.08) / 0.84)) : 0
      const suave = mezcla * mezcla * (3 - 2 * mezcla)
      fijarEscena(0, lista[i], gl!.TEXTURE0)
      fijarEscena(1, lista[i + 1], gl!.TEXTURE1)
      gl!.uniform1f(u('uSeed0'), i * 1.37)
      gl!.uniform1f(u('uSeed1'), (i + 1) * 1.37)
      gl!.uniform1f(u('uMix'), suave)
      gl!.uniform1f(u('uTime'), quieto ? 8 : (ahora - inicio) / 1000)
      raton.rx += (raton.x - raton.rx) * 0.06
      raton.ry += (raton.y - raton.ry) * 0.06
      gl!.uniform2f(u('uMouse'), raton.rx, raton.ry)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      if (!quieto || suavizado !== objetivo) pedir()
      else setTimeout(pedir, 120) // sin animación: solo sigue el scroll
    }
    pedir()

    return () => {
      cancelAnimationFrame(raf)
      obsTam.disconnect()
      obsVis.disconnect()
      window.removeEventListener('pointermove', mover)
      // No se usa loseContext(): React puede volver a montar el efecto sobre el mismo canvas.
      texturas.forEach((t) => gl.deleteTexture(t.tex))
      gl.deleteTexture(negra)
      gl.deleteBuffer(buf)
      gl.deleteProgram(programa)
    }
  }, [quieto, progreso])

  // Fotos nuevas (p. ej. el usuario subió una desde el chat).
  useEffect(() => { cargar.current(escenas) }, [escenas])

  return (
    <>
      <canvas ref={lienzo} className={className} aria-hidden="true" style={sinWebgl ? { display: 'none' } : undefined} />
      {sinWebgl && (
        <div className={className} aria-hidden="true"
          style={{ background: escenas[0]?.imagen ? `center / cover url(${escenas[0].imagen})` : `linear-gradient(135deg, ${escenas[0]?.colores.join(', ')})` }} />
      )}
    </>
  )
}
