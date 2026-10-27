
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
  // FORMULARIO
  //
  // En creación:
  // - características comunes una sola vez.
  // - N pares IMEI 1 / IMEI 2.
  //
  // En edición:
  // - se mantiene un solo par de IMEI.
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
    ],

    equipos: this.fb.array([
      this.crearEquipoForm(
        this.data?.stock?.imei1 ?? '',
        this.data?.stock?.imei2 ?? ''
      )
    ])

  });

  // ===================================================
  // CREAR FILA IMEI
  // ===================================================

  private crearEquipoForm(
    imei1 = '',
    imei2 = ''
  ) {

    return this.fb.nonNullable.group({

      imei1: [
        imei1,
        [
          Validators.required,
          Validators.pattern(/^\d{15}$/)
        ]
      ],

      imei2: [
        imei2,
        [
          Validators.pattern(/^$|^\d{15}$/)
        ]
      ]

    });

  }

  // ===================================================
  // ACCESO A FILAS IMEI
  // ===================================================

  get equipos() {
    return this.form.controls.equipos;
  }

  get cantidadEquipos(): number {
    return this.equipos.length;
  }

  // ===================================================
  // AGREGAR EQUIPO
  // ===================================================

  agregarEquipo(): void {

    if (
      this.esEdicion ||
      this.guardando()
    ) {
      return;
    }

    if (
      this.equipos.length >= 200
    ) {

      this.notify.warning(
        'El lote no puede superar 200 equipos'
      );

      return;

    }

    this.equipos.push(
      this.crearEquipoForm()
    );

  }

  // ===================================================
  // ELIMINAR EQUIPO DEL LOTE
  // ===================================================

  eliminarEquipo(
    index: number
  ): void {

    if (
      this.esEdicion ||
      this.guardando() ||
      this.equipos.length <= 1
    ) {
      return;
    }

    this.equipos.removeAt(index);

  }

  // ===================================================
  // VALIDAR IMEI REPETIDO ENTRE FILAS
  //
  // Se conserva el comportamiento actual:
  // IMEI1 e IMEI2 iguales en la misma fila no se
  // consideran duplicado.
  // ===================================================

  imeiDuplicado(
    index: number,
    campo: 'imei1' | 'imei2'
  ): boolean {

    const actual =
      String(
        this.equipos
          .at(index)
          .controls[campo]
          .value ?? ''
      ).trim();

    if (!actual) {
      return false;
    }

    return this.equipos.controls.some(
      (equipo, posicion) => {

        if (posicion === index) {
          return false;
        }

        const imei1 =
          String(
            equipo.controls.imei1.value ?? ''
          ).trim();

        const imei2 =
          String(
            equipo.controls.imei2.value ?? ''
          ).trim();

        return (
          imei1 === actual ||
          imei2 === actual
        );

      }
    );

  }

  // ===================================================
  // EXISTEN IMEI REPETIDOS
  // ===================================================

  hayImeisDuplicados(): boolean {

    const usados =
      new Set<string>();

    for (
      const equipo of
      this.equipos.controls
    ) {

      const imeisFila =
        new Set(
          [
            String(
              equipo.controls.imei1.value ?? ''
            ).trim(),
            String(
              equipo.controls.imei2.value ?? ''
            ).trim()
          ].filter(Boolean)
        );

      for (
        const imei of imeisFila
      ) {

        if (usados.has(imei)) {
          return true;
        }

        usados.add(imei);

      }

    }

    return false;

  }

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
  // ERRORES VISIBLES DEL FORMULARIO
  // ===================================================
  readonly mostrarErrores = signal(false);

  campoConError(campo: keyof Pick<typeof this.form.controls, "factura" | "precioCosto" | "precioVenta" | "estadoCelular">): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.dirty || control.touched || this.mostrarErrores());
  }

  equipoConError(indice: number): boolean {
    return this.imeiConError(indice, "imei1") || this.imeiConError(indice, "imei2");
  }

  imeiConError(indice: number, campo: "imei1" | "imei2"): boolean {
    const control = this.equipos.at(indice).controls[campo];
    return (control.invalid && (control.dirty || control.touched || this.mostrarErrores())) || this.imeiDuplicado(indice, campo);
  }

  precioVentaInsuficiente(): boolean {
    const costo = this.form.controls.precioCosto;
    const venta = this.form.controls.precioVenta;
    return costo.valid && venta.valid && Number(venta.value) <= Number(costo.value) && (venta.dirty || costo.dirty || this.mostrarErrores());
  }

  proveedorConError(): boolean {
    return !this.proveedorSeleccionado() && (this.proveedorTexto.dirty || this.proveedorTexto.touched || this.mostrarErrores());
  }

  modeloConError(): boolean {
    return !this.modeloSeleccionado() && (this.modeloTexto.dirty || this.modeloTexto.touched || this.mostrarErrores());
  }

  erroresFormulario(): string[] {
    const errores: string[] = [];
    const c = this.form.controls;
    if (!this.proveedorSeleccionado() || Number(c.idProveedor.value) <= 0) errores.push('Seleccione un proveedor desde las sugerencias.');
    if (!this.modeloSeleccionado() || Number(c.idModelo.value) <= 0) errores.push('Seleccione un modelo desde las sugerencias.');
    if (!c.factura.value) errores.push('Seleccione Factura o Nota de venta.');
    if (c.precioCosto.invalid) errores.push('Ingrese un precio de costo mayor a cero.');
    if (c.precioVenta.invalid) errores.push('Ingrese un precio de venta mayor a cero.');
    if (Number(c.precioVenta.value) <= Number(c.precioCosto.value) && !c.precioCosto.invalid && !c.precioVenta.invalid) errores.push('El precio de venta debe ser mayor al costo.');
    if (c.estadoCelular.invalid) errores.push('Seleccione un estado válido del celular.');
    this.equipos.controls.forEach((equipo, i) => {
      if (equipo.controls.imei1.invalid) errores.push(`Equipo ${i + 1}: IMEI 1 debe tener exactamente 15 dígitos.`);
      if (equipo.controls.imei2.invalid) errores.push(`Equipo ${i + 1}: IMEI 2 debe estar vacío o tener 15 dígitos.`);
    });
    if (this.hayImeisDuplicados()) errores.push('Hay IMEI repetidos entre diferentes equipos.');
    return errores;
  }

  // ===================================================
  // GUARDAR
  // ===================================================

  guardar(): void {
    if (this.guardando() || this.cargandoSeleccionInicial()) return;
    this.mostrarErrores.set(true);
    this.form.markAllAsTouched();
    this.proveedorTexto.markAsTouched();
    this.modeloTexto.markAsTouched();
    const errores = this.erroresFormulario();
    if (this.form.invalid || errores.length) {
      this.notify.warning(errores[0] ?? 'Revise los campos obligatorios del formulario.');
      return;
    }

    const proveedor =
      this.proveedorSeleccionado();

    const modelo =
      this.modeloSeleccionado();

    if (
      !proveedor ||
      this.form.controls.idProveedor.value !==
      proveedor.id
    ) {

      this.notify.warning(
        'Seleccione un proveedor de la lista'
      );

      return;

    }

    if (
      !modelo ||
      this.form.controls.idModelo.value !==
      modelo.id
    ) {

      this.notify.warning(
        'Seleccione un modelo de la lista'
      );

      return;

    }

    const value =
      this.form.getRawValue();

    const datosComunes = {

      idProveedor:
        Number(value.idProveedor),

      idModelo:
        Number(value.idModelo),

      factura:
        value.factura,

      precioCosto:
        Number(value.precioCosto),

      precioVenta:
        Number(value.precioVenta),

      estadoCelular:
        value.estadoCelular
          .trim()
          .toUpperCase()

    };

    const equipos =
      value.equipos.map(
        equipo => ({
          imei1:
            equipo.imei1.trim(),
          imei2:
            equipo.imei2.trim()
        })
      );

    const request =
      this.data.stock
        ? this.service.actualizar(
          this.data.stock.id,
          {
            ...datosComunes,
            imei1:
              equipos[0].imei1,
            imei2:
              equipos[0].imei2
          }
        )
        : this.service.crear(
          {
            ...datosComunes,
            equipos
          }
        );

    this.guardando.set(true);

    request
      .pipe(
        finalize(
          () =>
            this.guardando.set(false)
        ),
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: response => {

          this.notify.success(
            response.message
          );

          this.ref.close(true);

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            (
              this.esEdicion
                ? 'No fue posible actualizar el equipo'
                : 'No fue posible registrar los equipos'
            )
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
