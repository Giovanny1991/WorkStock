import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { Cliente } from '../../clientes/cliente.model';
import { ClientesService } from '../../clientes/clientes.service';
import { ClienteDialog } from '../../clientes/cliente-dialog/cliente-dialog';

import { StockCelular } from '../../stock-celulares/stock-celular.model';
import { StockCelularesService } from '../../stock-celulares/stock-celulares.service';

import { NotasVentaService } from '../notas-venta.service';

import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import {
  NotaVentaDetalleComponent
} from '../nota-venta-detalle/nota-venta-detalle';

interface ProductoNotaVenta extends StockCelular {
  precioTotal: number;
}

@Component({
  selector: 'app-nueva-nota',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './nueva-nota.html',
  styleUrl: './nueva-nota.scss'
})
export class NuevaNotaVenta implements OnInit {
  private readonly auth = inject(AuthService);

  readonly esAdministrador = computed(() =>
    this.auth.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );
  private readonly clientesService = inject(ClientesService);
  private readonly stockService = inject(StockCelularesService);
  private readonly notasService = inject(NotasVentaService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  readonly cargando = signal(false);
  readonly guardando = signal(false);

  readonly clientes = signal<Cliente[]>([]);
  readonly clientesFiltrados = signal<Cliente[]>([]);

  readonly stock = signal<StockCelular[]>([]);
  readonly stockFiltrado = signal<StockCelular[]>([]);

  readonly detalle = signal<ProductoNotaVenta[]>([]);

  readonly idCliente = signal(0);
  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly busquedaCliente = signal('');

  readonly clienteTexto = new FormControl('', {
    nonNullable: true
  });

  readonly productoTexto = new FormControl('', {
    nonNullable: true
  });


  readonly displayedColumns = computed(() => {
    const columnas = [
      'producto',
      'imei'
    ];

    if (this.esAdministrador()) {
      columnas.push('costo');
    }

    columnas.push(
      'precio',
      'acciones'
    );

    return columnas;
  });


  readonly clienteExiste = computed(() => {
    const valor = this.busquedaCliente()
      .trim()
      .toUpperCase();

    return this.clientes().some(
      x => x.identificacion.toUpperCase() === valor
    );
  });

  readonly puedeRegistrarCliente = computed(() => {
    const valor = this.busquedaCliente()
      .trim()
      .toUpperCase();

    const esCedula = /^\d{10}$/.test(valor);
    const esRuc = /^\d{13}$/.test(valor);
    const esPasaporte = /^P[A-Z0-9]{1,12}$/.test(valor);

    return (
      (esCedula || esRuc || esPasaporte) &&
      !this.clienteExiste() &&
      !this.clienteSeleccionado()
    );
  });

  readonly total = computed(() =>
    this.detalle().reduce(
      (total, producto) =>
        total + Number(producto.precioTotal || 0),
      0
    )
  );


  readonly puedeGuardar = computed(() =>
    this.idCliente() > 0 &&
    this.detalle().length > 0 &&
    this.detalle().every(producto =>
      !this.precioInvalido(producto)
    )
  );


  ngOnInit(): void {
    this.cargarDatos();

    this.clienteTexto.valueChanges.subscribe(value => {
      this.idCliente.set(0);
      this.clienteSeleccionado.set(null);

      const texto = value.trim().toLowerCase();

      this.busquedaCliente.set(
        value.trim().toUpperCase()
      );

      this.clientesFiltrados.set(
        this.clientes().filter(cliente =>
          this.descripcionCliente(cliente)
            .toLowerCase()
            .includes(texto)
        )
      );
    });

    this.productoTexto.valueChanges.subscribe(value => {
      this.filtrarProductos(
        value.trim().toLowerCase()
      );
    });
  }

  private cargarDatos(): void {
    this.cargando.set(true);

    forkJoin({
      clientes: this.clientesService.listar(),
      stock: this.stockService.listarDisponibles()
    })
      .pipe(
        finalize(() => this.cargando.set(false))
      )
      .subscribe({
        next: ({ clientes, stock }) => {
          this.clientes.set(clientes.data);
          this.clientesFiltrados.set(clientes.data);


          const disponibles = (stock.data ?? []).filter(
            x =>
              x.estado === 'INGRESADO' &&
              x.factura === 'NO'
          );

          this.stock.set(disponibles);
          this.stockFiltrado.set(disponibles);

          // Equipo seleccionado desde Stock
          const idParametro =
            this.route.snapshot.queryParamMap.get('productoId');

          if (idParametro !== null) {

            const idProducto = Number(idParametro);

            if (
              !Number.isSafeInteger(idProducto) ||
              idProducto <= 0
            ) {
              this.notify.warning(
                'El identificador del equipo no es válido'
              );
              return;
            }

            const producto = disponibles.find(
              x => Number(x.id) === idProducto
            );

            if (!producto) {
              this.notify.warning(
                'El equipo no está disponible para nota de venta'
              );
              return;
            }

            this.seleccionarProducto(
              this.descripcionProducto(producto)
            );

          }


          this.stock.set(disponibles);
          this.stockFiltrado.set(disponibles);
        },

        error: () => {
          this.notify.error(
            'No fue posible cargar los datos'
          );
        }
      });
  }

  descripcionCliente(cliente: Cliente): string {
    return `${cliente.identificacion} - ${cliente.nombreCliente}`;
  }

  descripcionProducto(stock: StockCelular): string {
    return `${stock.imei1} - ${stock.nombreMarca} ${stock.nombreModelo} / ${stock.ram} RAM / ${stock.almacenamiento} GB / ${stock.color}`;
  }

  seleccionarCliente(descripcion: string): void {
    const cliente = this.clientes().find(
      x =>
        this.descripcionCliente(x) === descripcion
    );

    if (!cliente) return;

    this.idCliente.set(cliente.id);
    this.clienteSeleccionado.set(cliente);
    this.busquedaCliente.set(cliente.identificacion);

    this.clienteTexto.setValue(
      this.descripcionCliente(cliente),
      { emitEvent: false }
    );
  }

  registrarCliente(): void {
    const identificacion =
      this.busquedaCliente();

    this.dialog.open(ClienteDialog, {
      width: '600px',
      maxWidth: '94vw',
      disableClose: true,
      data: {
        identificacionInicial: identificacion
      }
    })
      .afterClosed()
      .subscribe(resultado => {
        if (!resultado || resultado === true)
          return;

        const cliente = resultado as Cliente;

        this.clientes.update(actual => {
          const existe = actual.some(
            x => x.id === cliente.id
          );

          return existe
            ? actual
            : [...actual, cliente];
        });

        this.idCliente.set(cliente.id);
        this.clienteSeleccionado.set(cliente);
        this.busquedaCliente.set(
          cliente.identificacion
        );

        this.clienteTexto.setValue(
          this.descripcionCliente(cliente),
          { emitEvent: false }
        );

        this.clientesFiltrados.set(
          this.clientes()
        );
      });
  }

  actualizarCliente(): void {
    const cliente =
      this.clienteSeleccionado();

    if (!cliente) return;

    this.dialog.open(ClienteDialog, {
      width: '600px',
      maxWidth: '94vw',
      disableClose: true,
      data: { cliente }
    })
      .afterClosed()
      .subscribe(guardado => {
        if (!guardado) return;

        this.clientesService.listar()
          .subscribe({
            next: r => {
              this.clientes.set(r.data);
              this.clientesFiltrados.set(
                r.data
              );

              const actualizado =
                r.data.find(
                  x => x.id === cliente.id
                );

              if (!actualizado) return;

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
                { emitEvent: false }
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

  seleccionarProducto(
    descripcion: string
  ): void {
    const producto = this.stock().find(
      x =>
        this.descripcionProducto(x) ===
        descripcion
    );

    if (!producto) return;

    if (
      this.detalle().some(
        x => x.id === producto.id
      )
    ) {
      this.notify.warning(
        'Este equipo ya fue agregado'
      );
      return;
    }

    this.detalle.update(actual => [
      ...actual,
      {
        ...producto,
        precioTotal:
          Number(producto.precioVenta)
      }
    ]);

    this.productoTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.filtrarProductos('');
  }

  private filtrarProductos(
    texto: string
  ): void {
    const seleccionados = new Set(
      this.detalle().map(x => x.id)
    );

    this.stockFiltrado.set(
      this.stock().filter(
        x =>
          !seleccionados.has(x.id) &&
          this.descripcionProducto(x)
            .toLowerCase()
            .includes(texto)
      )
    );
  }


  actualizarPrecio(id: number, value: string): void {
    const texto = value.trim();

    const precio = texto === ''
      ? NaN
      : Number(texto);

    this.detalle.update(actual =>
      actual.map(producto =>
        producto.id === id
          ? {
            ...producto,
            precioTotal: precio
          }
          : producto
      )
    );
  }


  precioInvalido(producto: ProductoNotaVenta): boolean {
    const precio = Number(producto.precioTotal);
    const costo = Number(producto.precioCosto);

    return (
      !Number.isFinite(precio) ||
      precio < 0 ||
      precio < costo
    );
  }


  eliminarProducto(
    producto: ProductoNotaVenta
  ): void {
    this.detalle.update(actual =>
      actual.filter(
        x => x.id !== producto.id
      )
    );

    this.filtrarProductos(
      this.productoTexto.value
        .trim()
        .toLowerCase()
    );
  }

  guardar(): void {
    if (!this.idCliente()) {
      this.notify.warning(
        'Seleccione un cliente'
      );
      return;
    }

    if (!this.detalle().length) {
      this.notify.warning(
        'Agregue por lo menos un equipo'
      );
      return;
    }


    const precioInvalido = this.detalle().find(
      producto => this.precioInvalido(producto)
    );


    if (precioInvalido) {
      this.notify.error(
        `Ingrese un precio de venta válido para el IMEI ${precioInvalido.imei1}. El precio no puede estar vacío, ser negativo ni ser menor al costo.`
      );
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
            'Confirmar nota de venta',

          message:
            `Se generará la nota de venta por ${this.formatearTotal(this.total())}. ¿Desea continuar?`,

          confirmText:
            'Generar nota'
        }
      }
    )
      .afterClosed()
      .subscribe(confirmado => {
        if (confirmado)
          this.generarNota();
      });
  }

  private generarNota(): void {
    const data = {
      idCliente: this.idCliente(),

      detalle: this.detalle().map(
        x => ({
          idProducto: x.id,
          precioTotal:
            Number(x.precioTotal)
        })
      )
    };

    this.guardando.set(true);

    this.notasService.crear(data)
      .pipe(
        finalize(() =>
          this.guardando.set(false)
        )
      )
      .subscribe({
        next: r => {

          const idNotaVenta =
            r.data.idNotaVenta;

          this.notify.success(
            `${r.message} - N.º ${idNotaVenta}`
          );

          this.limpiar();

          this.cargarStock();

          this.visualizarNota(
            idNotaVenta
          );

        },

        error: e => {
          this.notify.error(
            e?.error?.message ??
            'No fue posible generar la nota de venta'
          );
        }
      });
  }

  private visualizarNota(
    idNotaVenta: number
  ): void {

    this.dialog.open(
      NotaVentaDetalleComponent,
      {
        width: '430px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        disableClose: true,
        autoFocus: false,
        data: {
          idNotaVenta
        }
      }
    );

  }

  private cargarStock(): void {
    this.stockService
      .listarDisponibles()
      .subscribe({
        next: r => {
          const disponibles =
            r.data.filter(
              x =>
                x.estado === 'INGRESADO' &&
                x.factura === 'NO'
            );

          this.stock.set(disponibles);
          this.stockFiltrado.set(
            disponibles
          );
        },

        error: () => {
          this.notify.error(
            'No fue posible actualizar los equipos disponibles'
          );
        }
      });
  }

  private limpiar(): void {
    this.idCliente.set(0);
    this.clienteSeleccionado.set(null);
    this.detalle.set([]);

    this.clienteTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.productoTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.busquedaCliente.set('');

    this.clientesFiltrados.set(
      this.clientes()
    );

    this.filtrarProductos('');
  }

  private formatearTotal(
    valor: number
  ): string {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: 'USD'
      }
    ).format(valor);
  }
}