/** Genera enlaces QR dentro de la aplicación Angular publicada, incluyendo subcarpetas IIS. */
export function enlaceCargaQr(tipo: 'fotos' | 'borrador', token: string): string {
  const base = new URL(document.baseURI);
  const ruta = `servicio-tecnico/qr-${tipo}/${encodeURIComponent(token)}`;
  // Con <base href="/WorkStock/"> funciona directamente. Si el despliegue
  // quedó con <base href="/"> en una subcarpeta, detectar el prefijo visible.
  let prefijo = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  const actual = window.location.pathname;
  const marcador = '/servicio-tecnico/';
  const posicion = actual.toLowerCase().indexOf(marcador);
  if (prefijo === '/' && posicion > 0) prefijo = `${actual.slice(0, posicion)}/`;
  return new URL(`${prefijo}${ruta}`, window.location.origin).href;
}
