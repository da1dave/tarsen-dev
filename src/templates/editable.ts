/*
 * Marca un elemento de la plantilla como editable en la "edición detallada" del editor:
 * data-editable="<lista>.<posición original>" (p. ej. "servicios.2") o "historiaFoto".
 * La posición original viene de `_i` (ver prepararDatos); si no existe, se usa la de la lista.
 */
export const editable = (lista: string, item: { _i?: number }, k: number) => ({ 'data-editable': `${lista}.${item._i ?? k}` })
