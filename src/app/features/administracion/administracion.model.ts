
/* =====================================================
   WORKSTOCK
   ADMINISTRACIÓN - MODELOS
===================================================== */

// =====================================================
// DATOS COMERCIALES Y TRIBUTARIOS DE EMPRESA
// =====================================================

export interface EmpresaDatosComerciales {

  razonSocial: string | null;

  regimenTributario: string | null;

  direccion: string | null;

  telefono: string | null;

  ciudad: string | null;

  pais: string | null;

  nombreLocal: string | null;

  actividadComercial: string | null;

  establecimiento: string | null;

  puntoEmision: string | null;

  autorizacionSri: string | null;

  fechaAutorizacionSri: string | null;

  correoElectronico: string | null;

  whatsApp: string | null;

  sitioWeb: string | null;

  obligadoLlevarContabilidad: boolean | null;

  leyendaTicket: string | null;

}

// =====================================================
// EMPRESA
// =====================================================

export interface Empresa extends EmpresaDatosComerciales {

  id: number;

  codigo: string;

  nombreEmpresa: string;

  ruc: string | null;

  estado: 'ACTIVA' | 'INACTIVA';

  operativaHabilitada: boolean;

  // Ruta lógica del logo, no URL pública.
  // El archivo se obtiene mediante endpoint protegido.

  logoEmpresa: string | null;

  fechaRegistro: string;

  totalUsuarios?: number;

}

// =====================================================
// EMPRESA ACTUAL / SESIÓN
// =====================================================

export interface EmpresaActual {

  id: number | null;

  codigo: string | null;

  nombre: string;

  operativaHabilitada: boolean;

  esSuperAdmin?: boolean;

}

// =====================================================
// USUARIO DE EMPRESA
// =====================================================

export interface UsuarioEmpresa {

  id: number;

  idEmpresa: number;

  nombreUsuario: string;

  login: string;

  rol: 'ADMINISTRADOR' | 'VENDEDOR';

  estado: 'ACTIVO' | 'INACTIVO';

  esSuperAdmin: boolean;

}

// =====================================================
// RESPUESTA API
// =====================================================

export interface RespuestaApi<T> {

  success: boolean;

  data: T;

  message?: string;

}

// =====================================================
// CREAR / ACTUALIZAR EMPRESA
// =====================================================

export interface EmpresaGuardar
  extends Partial<EmpresaDatosComerciales> {

  // Solo creación

  codigo?: string;

  // Creación y edición

  nombreEmpresa: string;

  ruc: string | null;

  // Solo edición

  estado?: 'ACTIVA' | 'INACTIVA';

  // Control operativo multiempresa

  operativaHabilitada?: boolean;

}

// =====================================================
// RESPUESTA LOGO EMPRESA
// =====================================================

export interface EmpresaLogoRespuesta {

  idEmpresa: number;

  logoEmpresa: string;

}

// =====================================================
// RESPUESTA ELIMINAR LOGO
// =====================================================

export interface EmpresaLogoEliminarRespuesta {

  idEmpresa: number;

  eliminado: boolean;

}

// =====================================================
// CREAR USUARIO
// =====================================================

export interface UsuarioCrear {

  nombreUsuario: string;

  login: string;

  password: string;

  rol: 'ADMINISTRADOR' | 'VENDEDOR';

}

// =====================================================
// ACTUALIZAR USUARIO
// =====================================================

export interface UsuarioActualizar {

  nombreUsuario: string;

  rol: 'ADMINISTRADOR' | 'VENDEDOR';

  estado: 'ACTIVO' | 'INACTIVO';

}
