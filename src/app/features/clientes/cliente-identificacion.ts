// Formato común para registrar clientes desde cualquier módulo de WorkStock.
// La validación definitiva de cédula/RUC corresponde al backend.
export const PATRON_IDENTIFICACION_CLIENTE = /^(?:\d{10}|\d{13}|P[A-Z0-9]+|LOCAL[A-Z0-9]+)$/i;
export const AYUDA_IDENTIFICACION_CLIENTE = 'Cédula: 10 dígitos · RUC: 13 dígitos · Pasaporte: P... · Local: LOCAL...';
export function identificacionClienteFormatoValido(valor: string): boolean {
  const normalizada = String(valor ?? '').trim().toUpperCase();
  return normalizada.length <= 30 && PATRON_IDENTIFICACION_CLIENTE.test(normalizada);
}
