// Redirección interna limitada exclusivamente a las dos pantallas de carga por QR.
// No admite dominios externos, rutas relativas ni barras codificadas.
export function rutaQrSegura(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null;
  const ruta = valor.trim();
  return /^\/servicio-tecnico\/qr-(?:fotos|borrador)\/[a-fA-F0-9]{64}$/.test(ruta) ? ruta : null;
}
