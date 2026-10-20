
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatAutocompleteModule
} from '@angular/material/autocomplete';

import {
  MatSelectModule
} from '@angular/material/select';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  StockCelular
} from '../stock-celular.model';

import {
  StockCelularesService
} from '../stock-celulares.service';

import {
  Proveedor
} from '../../proveedores/proveedor.model';

import {
  ProveedoresService
} from '../../proveedores/proveedores.service';

import {
  Modelo
} from '../../modelos/modelo.model';

import {
  ModelosService
} from '../../modelos/modelos.service';

import {
  NotificationService
} from '../../../core/services/notification';

// =====================================================
// DATOS DEL DIÁLOGO
// =====================================================

export interface StockDialogData {
  stock?: StockCelular;
}

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-stock-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './stock-dialog.html',
  styleUrl: './stock-dialog.scss'
})
export class StockDialog implements OnInit {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly fb = inject(FormBuilder);

  private readonly ref =
    inject(MatDialogRef<StockDialog>);

  private readonly service =
    inject(StockCelularesService);

  private readonly proveedoresService =
    inject(ProveedoresService);

  private readonly modelosService =
    inject(ModelosService);

  private readonly notify =
    inject(NotificationService);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // DATOS Y ESTADO GENERAL
  // ===================================================

  readonly data =
    inject<StockDialogData>(MAT_DIALOG_DATA);

  readonly esEdicion =
    !!this.data?.stock;

  readonly guardando =
    signal(false);

  readonly cargandoSeleccionInicial =
    signal(false);

  // ===================================================
  // PROVEEDORES
  // ===================================================

  readonly proveedores =
    signal<Proveedor[]>([]);

  readonly proveedoresFiltrados =
    signal<Proveedor[]>([]);

  readonly proveedorSeleccionado =
    signal<Proveedor | null>(null);

  readonly buscandoProveedores =
    signal(false);

  readonly errorBusquedaProveedores =
    signal(false);

  readonly proveedorTexto =
    new FormControl<string | Proveedor>(
      '',
      { nonNullable: true }
    );

  private versionBusquedaProveedor = 0;

  // ===================================================
  // MODELOS
  // ===================================================

  readonly modelos =
    signal<Modelo[]>([]);

  readonly modelosFiltrados =
    signal<Modelo[]>([]);

  readonly modeloSeleccionado =
    signal<Modelo | null>(null);

  readonly buscandoModelos =
    signal(false);

  readonly errorBusquedaModelos =
    signal(false);

  readonly modeloTexto =
    new FormControl<string | Modelo>(
      '',
      { nonNullable: true }
    );

  private versionBusquedaModelo = 0;

  // ===================================================
  // FORMULARIO ORIGINAL
  // ===================================================

  readonly form = this.fb.nonNullable.group({

    idProveedor: [
      this.data?.stock?.idProveedor ?? 0,
      [
        Validators.min(1)
      ]
    ],

    idModelo: [
      this.data?.stock?.idModelo ?? 0,
      [
        Validators.min(1)
      ]
    ],

    imei1: [
      this.data?.stock?.imei1 ?? '',
      [
        Validators.required,
        Validators.pattern(/^\d{15}$/)
      ]
    ],

    imei2: [
      this.data?.stock?.imei2 ?? '',
      [
        Validators.pattern(/^$|^\d{15}$/)
      ]
    ],

    factura: [
      this.data?.stock?.factura ?? '',
      [
        Validators.required
      ]
    ],

    precioCosto: [
      this.data?.stock?.precioCosto ?? 0,
      [
        Validators.required,
        Validators.min(0.001)
      ]
    ],

    precioVenta: [
      this.data?.stock?.precioVenta ?? 0,
      [
        Validators.required,
        Validators.min(0.001)
      ]
    ],

    estadoCelular: [
      this.data?.stock?.estadoCelular ?? '',
      [
        Validators.required,
        Validators.maxLength(10)
      ]
    ]

  });

  // ===================================================
  // INICIALIZAR
  // ===================================================

  ngOnInit(): void {

    this.configurarBusquedaProveedores();

    this.configurarBusquedaModelos();

    if (this.data?.stock) {
      this.precargarSeleccion();
    }

  }

  // ===================================================
  // DISPLAY WITH - PROVEEDOR
  // ===================================================

  readonly mostrarProveedor = (
    valor: Proveedor | string | null
  ): string => {

    if (!valor) {
      return '';
    }

    if (typeof valor === 'string') {
      return valor;
    }

    return valor.nombreProveedor;

  };

  // ===================================================
  // DISPLAY WITH - MODELO
  // ===================================================

  readonly mostrarModelo = (
    valor: Modelo | string | null
  ): string => {

    if (!valor) {
      return '';
    }

    if (typeof valor === 'string') {
      return valor;
    }

    return this.descripcionModelo(valor);

  };

  // ===================================================
  // DESCRIPCIÓN DE MODELO
  //
  // Conservamos el mismo formato original.
  // ===================================================

  descripcionModelo(modelo: Modelo): string {

    return (
      `${modelo.nombreMarca} ${modelo.nombreModelo} / ` +
      `${modelo.ram} RAM / ` +
      `${modelo.almacenamiento} GB / ` +
      `${modelo.color}`
    );

  }

  // ===================================================
  // BÚSQUEDA REMOTA DE PROVEEDORES
  // ===================================================

  private configurarBusquedaProveedores(): void {

    this.proveedorTexto.valueChanges
      .pipe(

        filter(
          (valor): valor is string =>
            typeof valor === 'string'
        ),

        tap(valor => {

          this.versionBusquedaProveedor++;

          this.form.controls.idProveedor.setValue(0);

          this.proveedorSeleccionado.set(null);

          this.proveedores.set([]);

          this.proveedoresFiltrados.set([]);

          this.errorBusquedaProveedores.set(false);

          this.buscandoProveedores.set(
            valor.trim().length >= 2
          );

        }),

        debounceTime(300),

        map(valor => valor.trim()),

        distinctUntilChanged(),

        switchMap(texto => {

          const version =
            this.versionBusquedaProveedor;

          if (
            texto.length < 2 ||
            this.proveedorSeleccionado()
          ) {

            this.buscandoProveedores.set(false);

            return of<Proveedor[]>([]);

          }

          this.buscandoProveedores.set(true);

          return this.proveedoresService
            .buscarParaAutocomplete(texto)
            .pipe(

              map(response => {

                if (
                  version !==
                  this.versionBusquedaProveedor
                ) {
                  return [];
                }

                return (response.data ?? [])
                  .filter(
                    proveedor =>
                      String(proveedor.estado)
                        .trim()
                        .toUpperCase() === 'ACTIVO'
                  );

              }),

              catchError(error => {

                if (
                  version ===
                  this.versionBusquedaProveedor
                ) {

                  this.errorBusquedaProveedores.set(true);

                  this.notify.error(
                    error?.error?.message ??
                    'No fue posible buscar los proveedores'
                  );

                }

                return of<Proveedor[]>([]);

              }),

              finalize(() => {

                if (
                  version ===
                  this.versionBusquedaProveedor
                ) {

                  this.buscandoProveedores.set(false);

                }

              })

            );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(proveedores => {

        if (this.proveedorSeleccionado()) {
          return;
        }

        this.proveedores.set(proveedores);

        this.proveedoresFiltrados.set(proveedores);

      });

  }

  // ===================================================
  // BÚSQUEDA REMOTA DE MODELOS
  // ===================================================

  private configurarBusquedaModelos(): void {

    this.modeloTexto.valueChanges
      .pipe(

        filter(
          (valor): valor is string =>
            typeof valor === 'string'
        ),

        tap(valor => {

          this.versionBusquedaModelo++;

          this.form.controls.idModelo.setValue(0);

          this.modeloSeleccionado.set(null);

          this.modelos.set([]);

          this.modelosFiltrados.set([]);

          this.errorBusquedaModelos.set(false);

          this.buscandoModelos.set(
            valor.trim().length >= 2
          );

        }),

        debounceTime(300),

        map(valor => valor.trim()),

        distinctUntilChanged(),

        switchMap(texto => {

          const version =
            this.versionBusquedaModelo;

          if (
            texto.length < 2 ||
            this.modeloSeleccionado()
          ) {

            this.buscandoModelos.set(false);

            return of<Modelo[]>([]);

          }

          this.buscandoModelos.set(true);

          return this.modelosService
            .buscarParaAutocomplete(texto)
            .pipe(

              map(response => {

                if (
                  version !==
                  this.versionBusquedaModelo
                ) {
                  return [];
                }

                return (response.data ?? [])
                  .filter(
                    modelo =>
                      String(modelo.estado)
                        .trim()
                        .toUpperCase() === 'ACTIVO'
                  );

              }),

              catchError(error => {

                if (
                  version ===
                  this.versionBusquedaModelo
                ) {

                  this.errorBusquedaModelos.set(true);

                  this.notify.error(
                    error?.error?.message ??
                    'No fue posible buscar los modelos'
                  );

                }

                return of<Modelo[]>([]);

              }),

              finalize(() => {

                if (
                  version ===
                  this.versionBusquedaModelo
                ) {

                  this.buscandoModelos.set(false);

                }

              })

            );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(modelos => {

        if (this.modeloSeleccionado()) {
          return;
        }

        this.modelos.set(modelos);

        this.modelosFiltrados.set(modelos);

      });

  }

  // ===================================================
  // SELECCIONAR PROVEEDOR
  // ===================================================

  seleccionarProveedor(
    proveedor: Proveedor
  ): void {

    if (
      !proveedor ||
      !Number.isSafeInteger(Number(proveedor.id)) ||
      Number(proveedor.id) <= 0
    ) {

      this.notify.warning(
        'Seleccione un proveedor válido'
      );

      return;

    }

    if (
      String(proveedor.estado)
        .trim()
        .toUpperCase() !== 'ACTIVO'
    ) {

      this.notify.warning(
        'El proveedor seleccionado no está activo'
      );

      return;

    }

    this.establecerProveedor(proveedor);

  }

  // ===================================================
  // ESTABLECER PROVEEDOR
  // ===================================================

  private establecerProveedor(
    proveedor: Proveedor
  ): void {

    this.versionBusquedaProveedor++;

    this.form.controls.idProveedor.setValue(
      Number(proveedor.id)
    );

    this.proveedorSeleccionado.set(proveedor);

    this.proveedores.set([proveedor]);

    this.proveedoresFiltrados.set([]);

    this.buscandoProveedores.set(false);

    this.errorBusquedaProveedores.set(false);

    this.proveedorTexto.setValue(
      proveedor,
      { emitEvent: false }
    );

  }

  // ===================================================
  // SELECCIONAR MODELO
  // ===================================================

  seleccionarModelo(
    modelo: Modelo
  ): void {

    if (
      !modelo ||
      !Number.isSafeInteger(Number(modelo.id)) ||
      Number(modelo.id) <= 0
    ) {

      this.notify.warning(
        'Seleccione un modelo válido'
      );

      return;

    }

    if (
      String(modelo.estado)
        .trim()
        .toUpperCase() !== 'ACTIVO'
    ) {

      this.notify.warning(
        'El modelo seleccionado no está activo'
      );

      return;

    }

    this.establecerModelo(modelo);

  }

  // ===================================================
  // ESTABLECER MODELO
  // ===================================================

  private establecerModelo(
    modelo: Modelo
  ): void {

    this.versionBusquedaModelo++;

    this.form.controls.idModelo.setValue(
      Number(modelo.id)
    );

    this.modeloSeleccionado.set(modelo);

    this.modelos.set([modelo]);

    this.modelosFiltrados.set([]);

    this.buscandoModelos.set(false);

    this.errorBusquedaModelos.set(false);

    this.modeloTexto.setValue(
      modelo,
      { emitEvent: false }
    );

  }

  // ===================================================
  // PRECARGAR REGISTROS EN EDICIÓN
  //
  // Dos consultas individuales:
  // GET /api/proveedores/:id
  // GET /api/modelos/:id
  //
  // No descargamos el catálogo completo.
  // ===================================================

  private precargarSeleccion(): void {

    const stock = this.data?.stock;

    if (!stock) {
      return;
    }

    this.cargandoSeleccionInicial.set(true);

    let solicitudesPendientes = 2;

    const finalizarCarga = (): void => {

      solicitudesPendientes--;

      if (solicitudesPendientes === 0) {
        this.cargandoSeleccionInicial.set(false);
      }

    };

    this.proveedoresService
      .obtenerPorId(Number(stock.idProveedor))
      .pipe(
        finalize(finalizarCarga),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          const proveedor = response.data;

          if (!proveedor) {
            this.form.controls.idProveedor.setValue(0);

            this.notify.error(
              'No se encontró el proveedor de este equipo'
            );

            return;
          }

          this.establecerProveedor(proveedor);

        },

        error: error => {

          this.form.controls.idProveedor.setValue(0);

          this.notify.error(
            error?.error?.message ??
            'No fue posible cargar el proveedor del equipo'
          );

        }

      });

    this.modelosService
      .obtenerPorId(Number(stock.idModelo))
      .pipe(
        finalize(finalizarCarga),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          const modelo = response.data;

          if (!modelo) {
            this.form.controls.idModelo.setValue(0);

            this.notify.error(
              'No se encontró el modelo de este equipo'
            );

            return;
          }

          this.establecerModelo(modelo);

        },

        error: error => {

          this.form.controls.idModelo.setValue(0);

          this.notify.error(
            error?.error?.message ??
            'No fue posible cargar el modelo del equipo'
          );

        }

      });

  }

  // ===================================================
  // GUARDAR
  //
  // Conserva el payload original y las validaciones.
  // ===================================================

  guardar(): void {

    if (
      this.form.invalid ||
      this.guardando() ||
      this.cargandoSeleccionInicial()
    ) {

      this.form.markAllAsTouched();

      return;

    }

    const proveedor = this.proveedorSeleccionado();

    const modelo = this.modeloSeleccionado();

    if (
      !proveedor ||
      this.form.controls.idProveedor.value !== proveedor.id
    ) {

      this.notify.warning(
        'Seleccione un proveedor de la lista'
      );

      return;

    }

    if (
      !modelo ||
      this.form.controls.idModelo.value !== modelo.id
    ) {

      this.notify.warning(
        'Seleccione un modelo de la lista'
      );

      return;

    }

    const value = this.form.getRawValue();

    const data = {

      idProveedor: Number(value.idProveedor),

      idModelo: Number(value.idModelo),

      imei1: value.imei1.trim(),

      imei2: value.imei2.trim(),

      factura: value.factura,

      precioCosto: Number(value.precioCosto),

      precioVenta: Number(value.precioVenta),

      estadoCelular:
        value.estadoCelular.trim().toUpperCase()

    };

    const request = this.data.stock
      ? this.service.actualizar(
          this.data.stock.id,
          data
        )
      : this.service.crear(data);

    this.guardando.set(true);

    request
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.notify.success(response.message);

          this.ref.close(true);

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible guardar el equipo'
          );

        }

      });

  }

  // ===================================================
  // CANCELAR
  // ===================================================

  cancelar(): void {

    if (!this.guardando()) {
      this.ref.close(false);
    }

  }

}
