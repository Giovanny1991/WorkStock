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
}


export interface OrdenTrabajoActualizarRequest {
  totalPendiente: boolean;

  total: number;
  abono: number;

  observaciones: string;

  estado:
    | 'INGRESADO'
    | 'FINALIZADO';
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

  estado: string;

  fechaIngreso?: string;

  vendedor?: string;
}


export interface OrdenesTrabajoResponse {
  success: boolean;

  data: OrdenTrabajoResumen[];
}


export interface OrdenTrabajoResponse {
  success: boolean;

  data: OrdenTrabajoResumen;
}


// =====================================================
// ACCESORIOS
// =====================================================

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
// ===================================================
// EVIDENCIAS FOTOGRÁFICAS
// ===================================================
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
