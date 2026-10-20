
import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatSelectModule
} from '@angular/material/select';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  Empresa,
  EmpresaGuardar
} from '../../administracion.model';

import {
  AdministracionService
} from '../../administracion.service';

// =====================================================
// DATOS DEL DIÁLOGO
// =====================================================

export interface EmpresaDialogData {
  empresa?: Empresa;
}

// =====================================================
// RESULTADO DEL DIÁLOGO
// COMPATIBLE CON EMPRESAS-ADMIN
// =====================================================

export interface EmpresaDialogResultado {
  datos: EmpresaGuardar;
  logoArchivo: File | null;
  eliminarLogo: boolean;
}

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-empresa-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './empresa-dialog.html',
  styleUrl: './empresa-dialog.scss'
})
export class EmpresaDialog implements OnDestroy {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly fb = inject(FormBuilder);

  private readonly service = inject(AdministracionService);

  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef = inject<
    MatDialogRef<
      EmpresaDialog,
      EmpresaDialogResultado | undefined
    >
  >(MatDialogRef);

  readonly data = inject<EmpresaDialogData>(MAT_DIALOG_DATA);

  readonly esEdicion = Boolean(this.data?.empresa);

  // ===================================================
  // ESTADOS
  // ===================================================

  readonly cargandoEmpresa = signal(false);

  readonly empresaCargada = signal(!this.esEdicion);

  readonly errorEmpresa = signal<string | null>(null);

  readonly cargandoLogo = signal(false);

  readonly logoArchivo = signal<File | null>(null);

  readonly logoVistaUrl = signal<string | null>(null);

  readonly logoError = signal<string | null>(null);

  readonly eliminarLogoSolicitado = signal(false);

  private logoActualObjectUrl: string | null = null;

  private logoNuevoObjectUrl: string | null = null;

  private readonly MAX_LOGO = 500 * 1024;

  private readonly TIPOS_LOGO = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
  ]);

  // ===================================================
  // FORMULARIO COMPLETO
  // ===================================================

  readonly form = this.fb.nonNullable.group({

    // Identificación

    codigo: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Za-z0-9-]{3,30}$/)
      ]
    ],

    nombreEmpresa: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150)
      ]
    ],

    razonSocial: [
      '',
      [Validators.maxLength(150)]
    ],

    ruc: [
      '',
      [Validators.pattern(/^$|^[0-9]{13}$/)]
    ],

    nombreLocal: [
      '',
      [Validators.maxLength(100)]
    ],

    actividadComercial: [
      '',
      [Validators.maxLength(200)]
    ],

    // Ubicación

    direccion: [
      '',
      [Validators.maxLength(250)]
    ],

    ciudad: [
      '',
      [Validators.maxLength(100)]
    ],

    pais: [
      'Ecuador',
      [Validators.maxLength(100)]
    ],

    // Contacto

    telefono: [
      '',
      [Validators.maxLength(30)]
    ],

    correoElectronico: [
      '',
      [
        Validators.email,
        Validators.maxLength(150)
      ]
    ],

    whatsApp: [
      '',
      [Validators.maxLength(30)]
    ],

    sitioWeb: [
      '',
      [Validators.maxLength(200)]
    ],

    // Tributarios

    regimenTributario: [
      '',
      [Validators.maxLength(150)]
    ],

    establecimiento: [
      '',
      [Validators.pattern(/^$|^[0-9]{3}$/)]
    ],

    puntoEmision: [
      '',
      [Validators.pattern(/^$|^[0-9]{3}$/)]
    ],

    autorizacionSri: [
      '',
      [Validators.maxLength(50)]
    ],

    fechaAutorizacionSri: [
      ''
    ],

    obligadoLlevarContabilidad: [
      ''
    ],

    // Personalización

    leyendaTicket: [
      '',
      [Validators.maxLength(500)]
    ],

    // Administración

    estado: [
      'ACTIVA',
      [Validators.required]
    ],

    operativaHabilitada: [
      false
    ]

  });

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  constructor() {

    if (this.esEdicion) {

      this.form.controls.codigo.disable({
        emitEvent: false
      });

      this.cargarEmpresaCompleta();

    }

    this.form.controls.estado.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(estado => {
        this.ajustarOperacionPorEstado(estado);
      });

    this.ajustarOperacionPorEstado(
      this.form.controls.estado.value
    );

  }

  // ===================================================
  // CARGAR EMPRESA COMPLETA
  // ===================================================

  private cargarEmpresaCompleta(): void {

    const idEmpresa = this.data.empresa?.id;

    if (!idEmpresa) {
      this.errorEmpresa.set(
        'No se recibió un identificador de empresa válido.'
      );
      return;
    }

    this.cargandoEmpresa.set(true);
    this.empresaCargada.set(false);
    this.errorEmpresa.set(null);

    this.service.obtenerEmpresaPorId(idEmpresa)
      .pipe(
        finalize(() => {
          this.cargandoEmpresa.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: respuesta => {

          if (
            !respuesta.success ||
            !respuesta.data ||
            respuesta.data.id !== idEmpresa
          ) {
            this.errorEmpresa.set(
              'No fue posible recuperar los datos completos de la empresa.'
            );
            return;
          }

          const empresa = respuesta.data;

          this.form.patchValue({

            codigo: empresa.codigo ?? '',

            nombreEmpresa: empresa.nombreEmpresa ?? '',

            razonSocial: empresa.razonSocial ?? '',

            ruc: empresa.ruc ?? '',

            nombreLocal: empresa.nombreLocal ?? '',

            actividadComercial: empresa.actividadComercial ?? '',

            direccion: empresa.direccion ?? '',

            ciudad: empresa.ciudad ?? '',

            pais: empresa.pais ?? '',

            telefono: empresa.telefono ?? '',

            correoElectronico: empresa.correoElectronico ?? '',

            whatsApp: empresa.whatsApp ?? '',

            sitioWeb: empresa.sitioWeb ?? '',

            regimenTributario: empresa.regimenTributario ?? '',

            establecimiento: empresa.establecimiento ?? '',

            puntoEmision: empresa.puntoEmision ?? '',

            autorizacionSri: empresa.autorizacionSri ?? '',

            fechaAutorizacionSri:
              this.normalizarFecha(empresa.fechaAutorizacionSri),

            obligadoLlevarContabilidad:
              empresa.obligadoLlevarContabilidad === null
                ? ''
                : empresa.obligadoLlevarContabilidad
                  ? 'SI'
                  : 'NO',

            leyendaTicket: empresa.leyendaTicket ?? '',

            estado: empresa.estado,

            operativaHabilitada:
              Boolean(empresa.operativaHabilitada)

          });

          this.ajustarOperacionPorEstado(empresa.estado);

          this.empresaCargada.set(true);

          if (empresa.logoEmpresa) {
            this.cargarLogoActual();
          }

        },

        error: () => {

          this.errorEmpresa.set(
            'No se pudo consultar la empresa. Verifica tu conexión y los permisos de acceso.'
          );

        }

      });

  }

  // ===================================================
  // NORMALIZAR FECHA PARA INPUT DATE
  // ===================================================

  private normalizarFecha(
    valor: string | null | undefined
  ): string {

    if (!valor) {
      return '';
    }

    return String(valor).slice(0, 10);

  }

  // ===================================================
  // ESTADO / OPERACIÓN
  // ===================================================

  private ajustarOperacionPorEstado(
    estado: string
  ): void {

    const control =
      this.form.controls.operativaHabilitada;

    if (estado === 'INACTIVA') {

      control.setValue(false, {
        emitEvent: false
      });

      control.disable({
        emitEvent: false
      });

      return;
    }

    control.enable({
      emitEvent: false
    });

  }

  operacionDeshabilitada(): boolean {

    return this.form.controls.estado.value === 'INACTIVA';

  }

  // ===================================================
  // OBTENER LOGO EXISTENTE
  // ===================================================

  private cargarLogoActual(): void {

    const empresa = this.data.empresa;

    if (!empresa) {
      return;
    }

    this.cargandoLogo.set(true);

    this.service.obtenerLogoEmpresa(empresa.id)
      .pipe(
        finalize(() => {
          this.cargandoLogo.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: blob => {

          if (!blob || blob.size === 0) {
            return;
          }

          this.liberarLogoActual();

          this.logoActualObjectUrl =
            URL.createObjectURL(blob);

          if (
            !this.logoArchivo() &&
            !this.eliminarLogoSolicitado()
          ) {
            this.logoVistaUrl.set(
              this.logoActualObjectUrl
            );
          }

        },

        error: () => {
          this.logoVistaUrl.set(null);
        }

      });

  }

  // ===================================================
  // SELECCIONAR LOGO
  // ===================================================

  seleccionarLogo(event: Event): void {

    this.logoError.set(null);

    const input = event.target as HTMLInputElement;

    const archivo = input.files?.[0] ?? null;

    input.value = '';

    if (!archivo) {
      return;
    }

    if (!this.TIPOS_LOGO.has(archivo.type)) {

      this.logoError.set(
        'El logo debe ser JPG, PNG o WEBP.'
      );

      return;
    }

    if (archivo.size > this.MAX_LOGO) {

      this.logoError.set(
        'El logo debe tener un tamaño máximo de 500 KB.'
      );

      return;
    }

    this.liberarLogoNuevo();

    this.logoNuevoObjectUrl =
      URL.createObjectURL(archivo);

    this.logoArchivo.set(archivo);

    this.eliminarLogoSolicitado.set(false);

    this.logoVistaUrl.set(
      this.logoNuevoObjectUrl
    );

  }

  // ===================================================
  // QUITAR LOGO
  // ===================================================

  quitarLogo(): void {

    this.logoError.set(null);

    if (this.logoArchivo()) {

      this.logoArchivo.set(null);

      this.liberarLogoNuevo();

      this.logoVistaUrl.set(
        this.eliminarLogoSolicitado()
          ? null
          : this.logoActualObjectUrl
      );

      return;
    }

    if (this.data.empresa?.logoEmpresa) {

      this.eliminarLogoSolicitado.set(true);

      this.logoVistaUrl.set(null);

    }

  }

  // ===================================================
  // RESTAURAR LOGO
  // ===================================================

  restaurarLogo(): void {

    this.eliminarLogoSolicitado.set(false);

    if (this.logoActualObjectUrl) {

      this.logoVistaUrl.set(
        this.logoActualObjectUrl
      );

      return;
    }

    if (this.data.empresa?.logoEmpresa) {
      this.cargarLogoActual();
    }

  }

  // ===================================================
  // TIENE LOGO
  // ===================================================

  tieneLogo(): boolean {

    return Boolean(
      this.logoArchivo() ||
      (
        this.data.empresa?.logoEmpresa &&
        !this.eliminarLogoSolicitado()
      )
    );

  }

  // ===================================================
  // CONVERSIÓN DE CAMPOS OPCIONALES
  // ===================================================

  private textoOpcional(
    valor: string
  ): string | null {

    return valor.trim() || null;

  }

  // ===================================================
  // GUARDAR
  // ===================================================

  guardar(): void {

    if (
      this.cargandoEmpresa() ||
      !this.empresaCargada()
    ) {
      return;
    }

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }

    const valor = this.form.getRawValue();

    const datos: EmpresaGuardar = {

      nombreEmpresa:
        valor.nombreEmpresa
          .trim()
          .replace(/\s+/g, ' '),

      ruc:
        this.textoOpcional(valor.ruc),

      razonSocial:
        this.textoOpcional(valor.razonSocial),

      regimenTributario:
        this.textoOpcional(valor.regimenTributario),

      direccion:
        this.textoOpcional(valor.direccion),

      telefono:
        this.textoOpcional(valor.telefono),

      ciudad:
        this.textoOpcional(valor.ciudad),

      pais:
        this.textoOpcional(valor.pais),

      nombreLocal:
        this.textoOpcional(valor.nombreLocal),

      actividadComercial:
        this.textoOpcional(valor.actividadComercial),

      establecimiento:
        this.textoOpcional(valor.establecimiento),

      puntoEmision:
        this.textoOpcional(valor.puntoEmision),

      autorizacionSri:
        this.textoOpcional(valor.autorizacionSri),

      fechaAutorizacionSri:
        this.textoOpcional(valor.fechaAutorizacionSri),

      correoElectronico:
        this.textoOpcional(valor.correoElectronico),

      whatsApp:
        this.textoOpcional(valor.whatsApp),

      sitioWeb:
        this.textoOpcional(valor.sitioWeb),

      obligadoLlevarContabilidad:
        valor.obligadoLlevarContabilidad === ''
          ? null
          : valor.obligadoLlevarContabilidad === 'SI',

      leyendaTicket:
        this.textoOpcional(valor.leyendaTicket)

    };

    // =================================================
    // CREACIÓN
    // =================================================

    if (!this.esEdicion) {

      datos.codigo =
        valor.codigo.trim().toUpperCase();

    }

    // =================================================
    // EDICIÓN
    // =================================================

    if (this.esEdicion) {

      datos.estado = valor.estado as
        'ACTIVA' | 'INACTIVA';

      datos.operativaHabilitada =
        valor.estado === 'ACTIVA' &&
        Boolean(valor.operativaHabilitada);

    }

    // =================================================
    // RESULTADO
    // =================================================

    this.dialogRef.close({

      datos,

      logoArchivo: this.logoArchivo(),

      eliminarLogo:
        this.eliminarLogoSolicitado() &&
        !this.logoArchivo()

    });

  }

  // ===================================================
  // CANCELAR
  // ===================================================

  cancelar(): void {
    this.dialogRef.close();
  }

  // ===================================================
  // LIBERAR LOGO NUEVO
  // ===================================================

  private liberarLogoNuevo(): void {

    if (this.logoNuevoObjectUrl) {

      URL.revokeObjectURL(
        this.logoNuevoObjectUrl
      );

      this.logoNuevoObjectUrl = null;

    }

  }

  // ===================================================
  // LIBERAR LOGO ACTUAL
  // ===================================================

  private liberarLogoActual(): void {

    if (this.logoActualObjectUrl) {

      URL.revokeObjectURL(
        this.logoActualObjectUrl
      );

      this.logoActualObjectUrl = null;

    }

  }

  // ===================================================
  // DESTROY
  // ===================================================

  ngOnDestroy(): void {

    this.liberarLogoNuevo();

    this.liberarLogoActual();

  }

}
