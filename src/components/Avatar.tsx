/* Foto de perfil redonda; sin foto, la inicial del nombre sobre un degradado. */
export default function Avatar({ nombre, src, tam = 32, className = '' }: { nombre: string; src?: string; tam?: number; className?: string }) {
  const estilo = { width: tam, height: tam, flex: 'none', borderRadius: '50%', objectFit: 'cover' as const }
  if (src) return <img src={src} alt="" className={className} style={estilo} />
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        ...estilo,
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #6c47ff, #b79bff)',
        color: '#fff',
        fontWeight: 700,
        fontSize: Math.round(tam * 0.42),
        lineHeight: 1,
      }}
    >
      {(nombre.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}
