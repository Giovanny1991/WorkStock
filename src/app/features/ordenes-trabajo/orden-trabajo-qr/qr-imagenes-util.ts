const MAX_BYTES = 2 * 1024 * 1024;
export async function prepararImagenQr(archivo: File): Promise<File> {
  if (!archivo.size) throw new Error('La fotografía está vacía.');
  const formatos = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (formatos.has(archivo.type) && archivo.size <= MAX_BYTES) return archivo;
  const url = URL.createObjectURL(archivo);
  try {
    const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`No se pudo abrir "${archivo.name}". Configura la cámara en JPG o selecciona una imagen JPG/PNG/WEBP.`));
      img.src = url;
    });
    for (const maxLado of [1920, 1600, 1280, 1024, 800]) {
      const escala = Math.min(1, maxLado / Math.max(imagen.naturalWidth, imagen.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('El navegador no permite procesar esta fotografía.');
      ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
      for (const calidad of [0.85, 0.72, 0.58, 0.45]) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
          result => result ? resolve(result) : reject(new Error('No se pudo convertir la fotografía.')), 'image/jpeg', calidad));
        if (blob.size > 0 && blob.size <= MAX_BYTES) {
          const nombre = archivo.name.replace(/\.[^.]+$/, '') || 'fotografia';
          return new File([blob], `${nombre}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
        }
      }
    }
    throw new Error(`La imagen "${archivo.name}" supera 2 MB incluso después de optimizarla.`);
  } finally { URL.revokeObjectURL(url); }
}
