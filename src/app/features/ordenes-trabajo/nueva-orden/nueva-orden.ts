
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';

import {
  CurrencyPipe,
  DecimalPipe
} from '@angular/common';

import {
  FormControl,
  ReactiveFormsModule
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
  MatAutocompleteModule
} from '@angular/material/autocomplete';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatCheckboxModule
} from '@angular/material/checkbox';

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatRadioModule
} from '@angular/material/radio';

import {
  MatTooltipModule
} from '@angular/material/tooltip';

import {
  Cliente
} from '../../clientes/cliente.model';

import {
  ClientesService
} from '../../clientes/clientes.service';

import {
  ClienteDialog
} from '../../clientes/cliente-dialog/cliente-dialog';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  OrdenesTrabajoService
} from '../ordenes-trabajo.service';

import {
  OrdenTrabajoDetalleComponent
} from '../orden-trabajo-detalle/orden-trabajo-detalle';

import {
  OrdenTrabajoImagenesComponent
} from '../orden-trabajo-imagenes/orden-trabajo-imagenes';

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-nueva-orden',
  standalone: true,

  imports: [
    OrdenTrabajoImagenesComponent,
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatTooltipModule
  ],

  templateUrl: './nueva-orden.html',
  styleUrl: './nueva-orden.scss'
})
export class NuevaOrden implements OnInit {

  // ===================================================
  // GALERÍA DE IMÁGENES
  // ===================================================

  @ViewChild(OrdenTrabajoImagenesComponent)
  galeria?: OrdenTrabajoImagenesComponent;

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly clientesService =
    inject(ClientesService);

  private readonly service =
    inject(OrdenesTrabajoService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialog =
    inject(MatDialog);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // CLIENTES - BÚSQUEDA REMOTA PAGINADA
  // ===================================================

  readonly clientes =
    signal<Cliente[]>([]);

  readonly clientesFiltrados =
    signal<Cliente[]>([]);

  readonly clienteSeleccionado =
    signal<Cliente | null>(null);

  readonly idCliente =
    signal(0);

  readonly busquedaCliente =
    signal('');

  readonly buscandoClientes =
    signal(false);

  readonly errorBusquedaClientes =
    signal(false);

  readonly clienteTexto =
    new FormControl<string | Cliente>(
      '',
      { nonNullable: true }
    );

  private versionBusquedaCliente = 0;

  // ===================================================
  // ESTADO GENERAL
  // ===================================================

  readonly guardando =
    signal(false);

  // ===================================================
  // EQUIPO RECIBIDO
  // ===================================================

  readonly modelo = new FormControl(
    '',
    { nonNullable: true }
  );

  readonly imei = new FormControl(
    '',
    { nonNullable: true }
  );

  readonly dano = new FormControl(
    '',
    { nonNullable: true }
  );

  readonly estadoRecepcion =
    new FormControl<
      'ENCENDIDO' | 'APAGADO' | null
    >(null);

  // ===================================================
  // ELEMENTOS RECIBIDOS
  // ===================================================

  readonly tapa = new FormControl(
    false,
    { nonNullable: true }
  );

  readonly bateria = new FormControl(
    false,
    { nonNullable: true }
  );

  readonly banSIM = new FormControl(
    false,
    { nonNullable: true }
  );

  // ===================================================
  // VALORES
  // ===================================================

  readonly totalPendiente = new FormControl(
    false,
    { nonNullable: true }
  );

  readonly total = new FormControl(
    0,
    { nonNullable: true }
  );

  readonly abono = new FormControl(
    0,
    { nonNullable: true }
  );

  // ===================================================
  // SALDO
  // ===================================================

  saldo(): number {

    if (this.totalPendiente.value) {
      return 0;
    }

    const total =
      Number(this.total.value || 0);

    const abono =
      Number(this.abono.value || 0);

    return Math.max(
      total - abono,
      0
    );

  }

  // ===================================================
  // CLIENTE EXISTE EN LOS RESULTADOS
  //
  // La validación definitiva de duplicados
  // continúa realizándose en el backend.
  // ===================================================

  readonly clienteExiste = computed(() => {

    const identificacion =
      this.busquedaCliente()
        .trim()
        .toUpperCase();

    return this.clientes().some(
      cliente =>
        cliente.identificacion
          .toUpperCase() === identificacion
    );

  });

  // ===================================================
  // PERMITIR REGISTRAR CLIENTE
  // ===================================================

  readonly puedeRegistrarCliente = computed(() => {

    const valor =
      this.busquedaCliente()
        .trim()
        .toUpperCase();

    const esCedula =
      /^\d{10}$/.test(valor);

    const esRuc =
      /^\d{13}$/.test(valor);

    const esPasaporte =
      /^P[A-Z0-9]{1,12}$/.test(valor);

    return (
      (esCedula || esRuc || esPasaporte) &&
      !this.buscandoClientes() &&
      !this.errorBusquedaClientes() &&
      !this.clienteExiste() &&
      !this.clienteSeleccionado()
    );

  });

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  ngOnInit(): void {

    this.configurarBusquedaClientes();

    this.configurarValorPendiente();

  }

  // ===================================================
  // DESCRIPCIÓN DEL CLIENTE
  // ===================================================

  descripcionCliente(
    cliente: Cliente
  ): string {

    return (
      `${cliente.identificacion} - ` +
      `${cliente.nombreCliente}`
    );

  }

  // ===================================================
  // MOSTRAR CLIENTE EN MAT-AUTOCOMPLETE
  //
  // Evita mostrar el ID numérico.
  // ===================================================

  readonly mostrarCliente = (
    valor: string | Cliente | null
  ): string => {

    if (!valor) {
      return '';
    }

    if (typeof valor === 'string') {
      return valor;
    }

    return this.descripcionCliente(valor);

  };

  // ===================================================
  // BUSCAR CLIENTES EN SQL SERVER
  //
  // - Mínimo 2 caracteres.
  // - Espera 300 ms.
  // - Consulta paginada.
  // - Cancelación de búsquedas anteriores.
  // - Selección por objeto.
  // ===================================================

  private configurarBusquedaClientes(): void {

    this.clienteTexto.valueChanges
      .pipe(

        // Solo las modificaciones de texto deben
        // iniciar búsquedas en SQL.
        filter(
          (valor): valor is string =>
            typeof valor === 'string'
        ),

        tap(valor => {

          this.versionBusquedaCliente++;

          // Si el usuario cambia el texto, la selección
          // anterior deja de ser válida.
          this.idCliente.set(0);

          this.clienteSeleccionado.set(null);

          const texto = valor.trim();

          this.busquedaCliente.set(
            texto.toUpperCase()
          );

          this.clientes.set([]);

          this.clientesFiltrados.set([]);

          this.errorBusquedaClientes.set(false);

          this.buscandoClientes.set(
            texto.length >= 2
          );

        }),

        debounceTime(300),

        map(valor => valor.trim()),

        distinctUntilChanged(),

        switchMap(texto => {

          const version =
            this.versionBusquedaCliente;

          if (
            texto.length < 2 ||
            this.clienteSeleccionado()
          ) {

            this.buscandoClientes.set(false);

            return of<Cliente[]>([]);

          }

          this.buscandoClientes.set(true);

          return this.clientesService
            .buscarParaAutocomplete(texto)
            .pipe(

              map(response => {

                if (
                  version !==
                  this.versionBusquedaCliente
                ) {
                  return [];
                }

                return response.data ?? [];

              }),

              catchError(error => {

                if (
                  version ===
                  this.versionBusquedaCliente
                ) {

                  this.errorBusquedaClientes.set(true);

                  this.notify.error(
                    error?.error?.message ??
                    'No fue posible buscar los clientes'
                  );

                }

                return of<Cliente[]>([]);

              }),

              finalize(() => {

                if (
                  version ===
                  this.versionBusquedaCliente
                ) {

                  this.buscandoClientes.set(false);

                }

              })

            );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(clientes => {

        // Una respuesta anterior no debe sustituir
        // un cliente que ya fue seleccionado.
        if (this.clienteSeleccionado()) {
          return;
        }

        this.clientes.set(clientes);

        this.clientesFiltrados.set(clientes);

      });

  }

  // ===================================================
  // SELECCIONAR CLIENTE
  // ===================================================

  seleccionarCliente(
    cliente: Cliente
  ): void {

    if (
      !cliente ||
      !Number.isSafeInteger(Number(cliente.id)) ||
      Number(cliente.id) <= 0
    ) {

      this.notify.warning(
        'No fue posible identificar el cliente seleccionado'
      );

      return;

    }

    this.establecerCliente(cliente);

  }

  // ===================================================
  // ESTABLECER CLIENTE
  // ===================================================

  private establecerCliente(
    cliente: Cliente
  ): void {

    this.versionBusquedaCliente++;

    this.idCliente.set(
      Number(cliente.id)
    );

    this.clienteSeleccionado.set(
      cliente
    );

    this.busquedaCliente.set(
      cliente.identificacion
    );

    this.clientes.set([
      cliente
    ]);

    this.clientesFiltrados.set([]);

    this.buscandoClientes.set(false);

    this.errorBusquedaClientes.set(false);

    // El objeto permite que displayWith muestre
    // identificación y nombre correctamente.
    this.clienteTexto.setValue(
      cliente,
      {
        emitEvent: false
      }
    );

  }

  // ===================================================
  // REGISTRAR CLIENTE
  // ===================================================

  registrarCliente(): void {

    if (!this.puedeRegistrarCliente()) {
      return;
    }

    const identificacion =
      this.busquedaCliente();

    this.dialog.open(
      ClienteDialog,
      {
        width: '600px',
        maxWidth: '94vw',
        disableClose: true,
        autoFocus: false,
        data: {
          identificacionInicial:
            identificacion
        }
      }
    )
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(resultado => {

        if (
          !resultado ||
          resultado === true
        ) {
          return;
        }

        const cliente =
          resultado as Cliente;

        this.establecerCliente(cliente);

      });

  }

  // ===================================================
  // EDITAR CLIENTE
  //
  // Se obtiene únicamente el registro actualizado.
  // No se descarga toda la tabla.
  // ===================================================

  editarCliente(): void {

    const cliente =
      this.clienteSeleccionado();

    if (!cliente) {
      return;
    }

    this.dialog.open(
      ClienteDialog,
      {
        width: '600px',
        maxWidth: '94vw',
        disableClose: true,
        autoFocus: false,
        data: {
          cliente
        }
      }
    )
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(resultado => {

        if (!resultado) {
          return;
        }

        this.clientesService
          .obtenerPorId(cliente.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe({

            next: response => {

              const actualizado =
                response.data;

              if (!actualizado) {

                this.notify.error(
                  'No se encontraron los datos del cliente actualizado'
                );

                return;

              }

              this.establecerCliente(
                actualizado
              );

            },

            error: () => {

              this.notify.error(
                'Cliente actualizado, pero no fue posible refrescar sus datos'
              );

            }

          });

      });

  }

  // ===================================================
  // VALOR POR CONFIRMAR
  //
  // Se conserva el comportamiento existente.
  // ===================================================

  private configurarValorPendiente(): void {

    this.totalPendiente.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(pendiente => {

        if (pendiente) {

          this.total.setValue(
            0,
            { emitEvent: false }
          );

          this.abono.setValue(
            0,
            { emitEvent: false }
          );

        }

      });

  }

  // ===================================================
  // CONFIRMAR REGISTRO
  // ===================================================

  guardar(): void {

    const error =
      this.validar();

    if (error) {

      this.notify.warning(error);

      return;

    }

    this.dialog.open(
      ConfirmDialog,
      {
        width: '430px',
        maxWidth: '92vw',
        disableClose: true,
        data: {
          title:
            'Confirmar orden de trabajo',
          message:
            '¿Desea registrar esta orden de trabajo?',
          confirmText:
            'Registrar'
        }
      }
    )
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(confirmado => {

        if (!confirmado) {
          return;
        }

        this.registrar();

      });

  }

  // ===================================================
  // REGISTRAR ORDEN
  //
  // Mantiene el payload original.
  // Mantiene la carga de fotografías.
  // ===================================================

  private registrar(): void {

    const recepcion =
      this.estadoRecepcion.value;

    this.guardando.set(true);

    this.service.crear({

      idCliente:
        this.idCliente(),

      modeloDispositivo:
        this.modelo.value.trim(),

      imei:
        this.imei.value.trim(),

      danoDispositivo:
        this.dano.value.trim(),

      encendido:
        recepcion === 'ENCENDIDO',

      apagado:
        recepcion === 'APAGADO',

      tapa:
        this.tapa.value,

      bateria:
        this.bateria.value,

      banSIM:
        this.banSIM.value,

      totalPendiente:
        this.totalPendiente.value,

      total:
        this.totalPendiente.value
          ? 0
          : Number(this.total.value),

      abono:
        this.totalPendiente.value
          ? 0
          : Number(this.abono.value)

    })
      .pipe(
        finalize(() => {
          this.guardando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: async response => {

          const idOrden =
            response.data.idOrden;

          try {

            await this.galeria
              ?.guardarPendientes(idOrden);

          } catch (error: unknown) {

            this.notify.warning(
              `Orden ${idOrden} registrada, pero no se pudieron subir las fotografías. Puedes agregarlas desde Gestionar orden.`
            );

            this.guardando.set(false);

            return;

          }

          this.notify.success(
            `${response.message} - N.º ${idOrden}`
          );

          this.limpiar();

          this.visualizarOrden(idOrden);

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible registrar la orden de trabajo'
          );

        }

      });

  }

  // ===================================================
  // VALIDAR ORDEN
  //
  // Conserva las reglas originales.
  // ===================================================

  private validar(): string | null {

    if (
      this.idCliente() <= 0
    ) {

      return 'Seleccione un cliente';

    }

    if (
      this.modelo.value.trim().length < 3
    ) {

      return 'El modelo debe tener mínimo 3 caracteres';

    }

    if (
      !/^\d{15}$/.test(
        this.imei.value.trim()
      )
    ) {

      return 'El IMEI debe contener 15 dígitos';

    }

    if (
      this.dano.value.trim().length < 3
    ) {

      return 'Ingrese el daño reportado del dispositivo';

    }

    if (
      !this.estadoRecepcion.value
    ) {

      return 'Seleccione si el equipo fue recibido encendido o apagado';

    }

    if (
      !this.totalPendiente.value
    ) {

      const total =
        Number(this.total.value);

      const abono =
        Number(this.abono.value);

      if (total <= 0) {

        return 'Ingrese el valor del servicio o marque Valor por confirmar';

      }

      if (abono < 0) {

        return 'El abono no puede ser negativo';

      }

      if (abono > total) {

        return 'El abono no puede ser mayor al valor del servicio';

      }

    }

    return null;

  }

  // ===================================================
  // LIMPIAR FORMULARIO
  // ===================================================

  limpiar(): void {

    this.versionBusquedaCliente++;

    this.idCliente.set(0);

    this.clienteSeleccionado.set(null);

    this.busquedaCliente.set('');

    this.clientes.set([]);

    this.clientesFiltrados.set([]);

    this.buscandoClientes.set(false);

    this.errorBusquedaClientes.set(false);

    this.clienteTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.modelo.setValue('');

    this.imei.setValue('');

    this.dano.setValue('');

    this.estadoRecepcion.setValue(null);

    this.tapa.setValue(false);

    this.bateria.setValue(false);

    this.banSIM.setValue(false);

    this.totalPendiente.setValue(
      false,
      { emitEvent: false }
    );

    this.total.setValue(0);

    this.abono.setValue(0);

  }

  // ===================================================
  // VISUALIZAR ORDEN
  // ===================================================

  visualizarOrden(
    idOrden: number
  ): void {

    this.dialog.open(
      OrdenTrabajoDetalleComponent,
      {
        width: '430px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        disableClose: true,
        autoFocus: false,
        data: {
          idOrden
        }
      }
    );

  }

}
