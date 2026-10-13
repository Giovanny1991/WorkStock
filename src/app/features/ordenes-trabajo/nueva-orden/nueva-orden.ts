import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  CurrencyPipe, DecimalPipe
} from '@angular/common';

import {
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import {
  finalize
} from 'rxjs';

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

import { OrdenTrabajoImagenesComponent } from '../orden-trabajo-imagenes/orden-trabajo-imagenes';
import { ViewChild } from '@angular/core';
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
  @ViewChild(OrdenTrabajoImagenesComponent) galeria?: OrdenTrabajoImagenesComponent;
  private readonly clientesService = inject(ClientesService);
  private readonly service = inject(OrdenesTrabajoService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly clientes = signal<Cliente[]>([]);
  readonly clientesFiltrados = signal<Cliente[]>([]);
  readonly clienteSeleccionado = signal<Cliente | null>(null);

  readonly idCliente = signal(0);
  readonly busquedaCliente = signal('');

  readonly guardando = signal(false);

  readonly modelo = new FormControl('', {
    nonNullable: true
  });

  readonly imei = new FormControl('', {
    nonNullable: true
  });

  readonly dano = new FormControl('', {
    nonNullable: true
  });

  readonly clienteTexto = new FormControl('', {
    nonNullable: true
  });

  readonly estadoRecepcion = new FormControl<
    'ENCENDIDO' | 'APAGADO' | null
  >(null);

  readonly tapa = new FormControl(false, {
    nonNullable: true
  });

  readonly bateria = new FormControl(false, {
    nonNullable: true
  });

  readonly banSIM = new FormControl(false, {
    nonNullable: true
  });

  readonly totalPendiente = new FormControl(false, {
    nonNullable: true
  });

  readonly total = new FormControl(0, {
    nonNullable: true
  });

  readonly abono = new FormControl(0, {
    nonNullable: true
  });

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

  readonly clienteExiste = computed(() =>
    this.clientes().some(
      x =>
        x.identificacion.toUpperCase() ===
        this.busquedaCliente().toUpperCase()
    )
  );

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
      esCedula ||
      esRuc ||
      esPasaporte
    ) &&
      !this.clienteExiste() &&
      !this.clienteSeleccionado();
  });

  ngOnInit(): void {
    this.cargarClientes();

    this.clienteTexto.valueChanges
      .subscribe(value => {

        if (typeof value !== 'string') {
          return;
        }

        this.idCliente.set(0);
        this.clienteSeleccionado.set(null);

        const texto =
          value.trim().toLowerCase();

        this.busquedaCliente.set(
          value.trim().toUpperCase()
        );

        this.clientesFiltrados.set(
          this.clientes().filter(x =>
            x.identificacion
              .toLowerCase()
              .includes(texto) ||
            x.nombreCliente
              .toLowerCase()
              .includes(texto)
          )
        );

      });

    this.totalPendiente.valueChanges
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

  cargarClientes(): void {
    this.clientesService.listar()
      .subscribe({
        next: r => {
          this.clientes.set(r.data);
          this.clientesFiltrados.set(r.data);
        },

        error: e => {
          this.notify.error(
            e?.error?.message ??
            'No fue posible cargar los clientes'
          );
        }
      });
  }

  seleccionarCliente(
    descripcion: string
  ): void {

    const cliente =
      this.clientes().find(
        x =>
          this.descripcionCliente(x) ===
          descripcion
      );

    if (!cliente) {
      return;
    }

    this.idCliente.set(
      cliente.id
    );

    this.clienteSeleccionado.set(
      cliente
    );

    this.busquedaCliente.set(
      cliente.identificacion
    );

    this.clienteTexto.setValue(
      this.descripcionCliente(cliente),
      {
        emitEvent: false
      }
    );

  }

  registrarCliente(): void {

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
      .subscribe(resultado => {

        if (
          !resultado ||
          resultado === true
        ) {
          return;
        }

        const cliente =
          resultado as Cliente;


        // Agregarlo al listado local
        // si todavía no existe.
        this.clientes.update(
          actual => {

            const existe =
              actual.some(
                x => x.id === cliente.id
              );

            return existe
              ? actual
              : [...actual, cliente];

          }
        );


        this.idCliente.set(
          cliente.id
        );

        this.clienteSeleccionado.set(
          cliente
        );

        this.busquedaCliente.set(
          cliente.identificacion
        );

        this.clienteTexto.setValue(
          this.descripcionCliente(cliente),
          {
            emitEvent: false
          }
        );

        this.clientesFiltrados.set(
          this.clientes()
        );

      });

  }

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
      .subscribe(resultado => {

        if (!resultado) {
          return;
        }


        this.clientesService
          .listar()
          .subscribe({

            next: r => {

              this.clientes.set(
                r.data
              );

              this.clientesFiltrados.set(
                r.data
              );


              const actualizado =
                r.data.find(
                  x =>
                    x.id === cliente.id
                );


              if (!actualizado) {
                return;
              }


              this.idCliente.set(
                actualizado.id
              );

              this.clienteSeleccionado.set(
                actualizado
              );

              this.busquedaCliente.set(
                actualizado.identificacion
              );

              this.clienteTexto.setValue(
                this.descripcionCliente(
                  actualizado
                ),
                {
                  emitEvent: false
                }
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
          title: 'Confirmar orden de trabajo',
          message:
            '¿Desea registrar esta orden de trabajo?',
          confirmText: 'Registrar'
        }
      }
    )
      .afterClosed()
      .subscribe(confirmado => {
        if (!confirmado) return;

        this.registrar();
      });
  }

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
        finalize(() =>
          this.guardando.set(false)
        )
      )
      .subscribe({

        next: async r => {

          const idOrden =
            r.data.idOrden;

          try {
            await this.galeria?.guardarPendientes(idOrden);
          } catch (error: any) {
            this.notify.warning(
              `Orden ${idOrden} registrada, pero no se pudieron subir las fotografías. Puedes agregarlas desde Gestionar orden.`
            );
            this.guardando.set(false);
            return;
          }

          this.notify.success(
            `${r.message} - N.º ${idOrden}`
          );

          this.limpiar();

          this.visualizarOrden(
            idOrden
          );

        },

        error: e => {

          this.notify.error(
            e?.error?.message ??
            'No fue posible registrar la orden de trabajo'
          );

        }

      });
  }

  private validar(): string | null {
    if (this.idCliente() <= 0) {
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

  limpiar(): void {
    this.idCliente.set(0);

    this.clienteSeleccionado.set(null);

    this.busquedaCliente.set('');

    this.clienteTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.modelo.setValue('');
    this.imei.setValue('');
    this.dano.setValue('');

    this.estadoRecepcion.setValue(
      null
    );

    this.tapa.setValue(false);
    this.bateria.setValue(false);
    this.banSIM.setValue(false);

    this.totalPendiente.setValue(
      false,
      { emitEvent: false }
    );

    this.total.setValue(0);
    this.abono.setValue(0);

    this.clientesFiltrados.set(
      this.clientes()
    );
  }

  descripcionCliente(
    cliente: Cliente
  ): string {

    return `${cliente.identificacion} - ${cliente.nombreCliente}`;

  }

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