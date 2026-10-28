export const ESTADOS_NOTIFICACION = [
    'EN DIAGNÓSTICO',
    'ESPERANDO REPUESTO',
    'REPARADO',
    'SIN REPARACIÓN',
    'ENTREGADO',
    'ENTREGADO SIN REPARAR',
    'EQUIPO ABANDONADO'
] as const;

export type EstadoNotificacion = typeof ESTADOS_NOTIFICACION[number];

export interface OrdenEstadoConfiguracion {
    id: number;
    estado: EstadoNotificacion;
    notificarCliente: boolean;
    mensajeCliente: string;
    activo: boolean;
    fechaActualizacion: string | null;
    idUsuarioActualiza: number | null;
}

export interface ConfiguracionesEstadosResponse {
    success: boolean;
    data: OrdenEstadoConfiguracion[];
}

export interface ActualizarEstadoNotificacionRequest {
    estado: EstadoNotificacion;
    notificarCliente: boolean;
    mensajeCliente: string;
}

export interface ActualizarEstadoNotificacionResponse {
    success: boolean;
    message: string;
    data: OrdenEstadoConfiguracion;
}

export const VARIABLES_MENSAJE = [
    { variable: '{CLIENTE}', descripcion: 'Nombre del cliente' },
    { variable: '{ORDEN}', descripcion: 'Número de orden' },
    { variable: '{EQUIPO}', descripcion: 'Modelo del equipo' },
    { variable: '{IMEI}', descripcion: 'IMEI del equipo' },
    { variable: '{ESTADO}', descripcion: 'Estado de la orden' },
    { variable: '{TOTAL}', descripcion: 'Valor del servicio' },
    { variable: '{SALDO}', descripcion: 'Saldo pendiente' },
    { variable: '{EMPRESA}', descripcion: 'Nombre de la empresa' }
] as const;