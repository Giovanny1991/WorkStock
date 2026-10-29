
export const ESTADOS_ORDEN_TRABAJO = [
  'EN DIAGNÓSTICO',
  'ESPERANDO REPUESTO',
  'REPARADO',
  'SIN REPARACIÓN',
  'ENTREGADO',
  'ENTREGADO SIN REPARAR',
  'EQUIPO ABANDONADO'
] as const;

export type EstadoOrdenTrabajoNuevo = typeof ESTADOS_ORDEN_TRABAJO[number];
export type EstadoOrdenTrabajo = EstadoOrdenTrabajoNuevo | 'INGRESADO' | 'FINALIZADO';

export const ESTADOS_ORDEN_CERRADOS: readonly EstadoOrdenTrabajo[] = [
  'FINALIZADO',
  'ENTREGADO',
  'ENTREGADO SIN REPARAR',
  'EQUIPO ABANDONADO'
];

export const ESTADOS_ORDEN_PENDIENTES: readonly EstadoOrdenTrabajo[] = [
  'INGRESADO',
  'EN DIAGNÓSTICO',
  'ESPERANDO REPUESTO',
  'REPARADO',
  'SIN REPARACIÓN'
];

export const ORDEN_ESTADO_INICIAL: EstadoOrdenTrabajoNuevo = 'EN DIAGNÓSTICO';

export type TipoBloqueoDispositivo =
  'NO_REGISTRADO' | 'SIN_BLOQUEO' | 'CONTRASENA' | 'PATRON';

export interface SeguridadDispositivo {
  tipoBloqueo: TipoBloqueoDispositivo;
  claveDispositivo?: string | null;
  patronDispositivo?: string | null;
}

export interface SeguridadDispositivoResponse {
  success: boolean;
  data: SeguridadDispositivo & { idOrden: number };
}

export const esOrdenCerrada = (estado: string | null | undefined): boolean =>
  ESTADOS_ORDEN_CERRADOS.includes(
    String(estado ?? '').trim().toUpperCase() as EstadoOrdenTrabajo
  );

export const esOrdenPendiente = (estado: string | null | undefined): boolean =>
  ESTADOS_ORDEN_PENDIENTES.includes(
    String(estado ?? '').trim().toUpperCase() as EstadoOrdenTrabajo
  );

export interface OrdenTrabajoRequest {
  idCliente: number;
  modeloDispositivo: string;
  imei: string;
  danoDispositivo: string;
  encendido: boolean;
  apagado: boolean;
  tapa: boolean;
  bateria: boolean;
  banSIM: boolean;
  totalPendiente: boolean;
  total: number;
  abono: number;
  tipoBloqueo?: TipoBloqueoDispositivo;
  claveDispositivo?: string | null;
  patronDispositivo?: string | null;
}

export interface OrdenTrabajoActualizarRequest {
  totalPendiente: boolean;
  total: number;
  abono: number;
  observaciones: string;
  estado: EstadoOrdenTrabajo;
  tipoBloqueo?: TipoBloqueoDispositivo;
  claveDispositivo?: string | null;
  patronDispositivo?: string | null;
}

export interface OrdenTrabajoCreada {
  idOrden: number;
  numeroOrden?: string;
}

export interface OrdenTrabajoCreadaResponse {
  success: boolean;
  message: string;
  data: OrdenTrabajoCreada;
}

export interface OrdenTrabajoResumen {
  id: number;
  idCliente?: number;
  idVendedor?: number;
  identificacion: string;
  nombreCliente: string;
  telefono?: string;
  direccion?: string;
  correo?: string;
  numeroOrden: string;
  modeloDispositivo: string;
  imei: string;
  danoDispositivo: string;
  encendido: boolean;
  apagado: boolean;
  tapa: boolean;
  bateria: boolean;
  banSIM: boolean;
  totalPendiente: boolean;
  total: number;
  abono: number;
  saldo: number;
  observaciones?: string;
  estado: EstadoOrdenTrabajo;
  fechaIngreso?: string;
  vendedor?: string;
  tipoBloqueo?: TipoBloqueoDispositivo;
}

export interface OrdenesTrabajoResponse {
  success: boolean;
  data: OrdenTrabajoResumen[];
}

export interface OrdenTrabajoResponse {
  success: boolean;
  data: OrdenTrabajoResumen;
}


export interface OrdenTrabajoEstadoHistorial {
  id: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  observaciones?: string | null;
  fechaRegistro: string;
  idUsuario: number | null;
  usuario?: string | null;
  mensajeNotificacion?: string | null;
  notificacionEstado?: string | null;
}


export interface OrdenTrabajoEstadoHistorialResponse {
  success: boolean;
  data: OrdenTrabajoEstadoHistorial[];
}

export interface AccesorioDisponibleOrden {
  id: number;
  idCategoria: number;
  idMarca: number;
  descripcion: string;
  accesorio: string;
  calidad?: string;
  cantidadStock: number;
}

export interface AccesorioUsadoOrden {
  id: number;
  idAccesorio: number;
  accesorio: string;
  cantidad: number;
}

export interface AgregarAccesorioOrdenRequest {
  idAccesorio: number;
  cantidad: number;
}

export interface AccesoriosDisponiblesResponse {
  success: boolean;
  data: AccesorioDisponibleOrden[];
}

export interface AccesoriosOrdenResponse {
  success: boolean;
  data: AccesorioUsadoOrden[];
}

export interface AccesorioOrdenOperacionResponse {
  success: boolean;
  message: string;
  data: {
    idOrden: number;
    idDetalle?: number;
  };
}

export interface OrdenTrabajoOperacionResponse {
  success: boolean;
  message: string;
}

export interface OrdenTrabajoImagen {
  id: number;
  idOrden: number;
  nombreArchivo: string;
  nombreOriginal: string;
  tipoArchivo: string;
  tamanoArchivo: number;
  fechaRegistro: string;
  idUsuario: number;
  usuarioRegistro?: string;
}

export interface OrdenTrabajoImagenesResponse {
  success: boolean;
  data: OrdenTrabajoImagen[];
  message?: string;
}

export interface OrdenTrabajoImagenOperacionResponse {
  success: boolean;
  message: string;
}
