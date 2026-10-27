
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

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

import { StockCelular } from '../../stock-celulares/stock-celular.model';
import { StockCelularesService } from '../../stock-celulares/stock-celulares.service';

import { FacturasService } from '../facturas.service';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { ClienteDialog } from '../../clientes/cliente-dialog/cliente-dialog';
import { FacturaDetalleComponent } from '../factura-detalle/factura-detalle';

interface ProductoFactura extends StockCelular {
  precioTotal: number;
}

@Component({
  selector: 'app-facturacion',
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
  templateUrl: './facturacion.html',
  styleUrl: './facturacion.scss'
})
export class Facturacion implements OnInit {

  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly auth = inject(AuthService);
  private readonly clientesService = inject(ClientesService);
  private readonly stockService = inject(StockCelularesService);
  private readonly facturasService = inject(FacturasService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // =====================================================
  // PERMISOS
  // =====================================================

  readonly esAdministrador = computed(() =>
    this.auth.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  // =====================================================
  // ESTADO GENERAL
  // =====================================================

  readonly cargando = signal(false);
  readonly facturando = signal(false);

  // =====================================================
  // CLIENTES - AUTOCOMPLETE REMOTO
  // =====================================================

  readonly clientes = signal<Cliente[]>([]);
  readonly clientesFiltrados = signal<Cliente[]>([]);
  readonly buscandoClientes = signal(false);
  readonly errorBusquedaClientes = signal(false);
  readonly busquedaCliente = signal('');

  readonly idCliente = signal(0);
  readonly clienteSeleccionado = signal<Cliente | null>(null);

  readonly clienteTexto = new FormControl<string | Cliente>(
    '',
    { nonNullable: true }
  );

  private versionBusquedaCliente = 0;

  // =====================================================
  // CELULARES - AUTOCOMPLETE REMOTO
  // =====================================================

  readonly stock = signal<StockCelular[]>([]);
  readonly stockFiltrado = signal<StockCelular[]>([]);

  readonly buscandoProductos = signal(false);
  readonly errorBusquedaProductos = signal(false);
  readonly busquedaProducto = signal('');

  readonly productoTexto = new FormControl<string | StockCelular>(
    '',
    { nonNullable: true }
  );

  private versionBusquedaProducto = 0;
  private precargaProductoProcesada = false;

  // =====================================================
  // DETALLE E IVA
  // =====================================================

  readonly detalle = signal<ProductoFactura[]>([]);
  readonly ivaPorcentaje = signal(0);

  // =====================================================
  // CLIENTE EXISTENTE
  // =====================================================

  readonly clienteExiste = computed(() => {

    const identificacion = this.busquedaCliente()
      .trim()
      .toUpperCase();

    return this.clientes().some(
      cliente =>
        cliente.identificacion.toUpperCase() === identificacion
    );

  });

  // =====================================================
  // REGISTRAR CLIENTE
  // =====================================================

  readonly puedeRegistrarCliente = computed(() => {

    const valor = this.busquedaCliente()
      .trim()
      .toUpperCase();

    const esCedula = /^\d{10}$/.test(valor);
    const esRuc = /^\d{13}$/.test(valor);
    const esPasaporte = /^P[A-Z0-9]{1,12}$/.test(valor);

    return (
      (esCedula || esRuc || esPasaporte) &&
      !this.buscandoClientes() &&
      !this.errorBusquedaClientes() &&
      !this.clienteExiste() &&
      !this.clienteSeleccionado()
    );

  });

  // =====================================================
  // COLUMNAS
  // =====================================================

  readonly displayedColumns = computed(() => {

    const columnas = ['producto', 'imei'];
    columnas.push('precio', 'acciones');

    return columnas;

  });

  // =====================================================
  // TOTALES
  // =====================================================

  readonly total = computed(() =>
    this.detalle().reduce(
      (total, producto) =>
        total + Number(producto.precioTotal || 0),
      0
    )
  );

  readonly subtotal = computed(() => {

    const iva = this.ivaPorcentaje();

    return iva >= 0
      ? this.total() / ((iva / 100) + 1)
      : 0;

  });

  readonly valorIva = computed(() =>
    this.total() - this.subtotal()
  );

  // =====================================================
  // VALIDAR FACTURACIÓN
  // =====================================================

  readonly puedeFacturar = computed(() =>
    this.idCliente() > 0 &&
    this.detalle().length > 0 &&
    this.detalle().every(producto => {

      const precio = Number(producto.precioTotal);
      const costo = Number(producto.precioCosto);

      return (
        Number.isFinite(precio) &&
        precio >= 0 &&
        precio >= costo
      );

    })
  );

  // =====================================================
  // INICIALIZACIÓN
  // =====================================================

  ngOnInit(): void {

    this.configurarBusquedaClientes();
    this.configurarBusquedaProductos();
    this.cargarDatos();

  }

  // =====================================================
  // MOSTRAR CLIENTE
  // =====================================================

  readonly mostrarCliente = (
    valor: Cliente | string | null
  ): string => {

    if (!valor) {
      return '';
    }

    if (typeof valor === 'string') {
      return valor;
    }

    return this.descripcionCliente(valor);

  };

  // =====================================================
  // MOSTRAR PRODUCTO
  //
  // Evita mostrar IDs u objetos en el input.
  // =====================================================

  readonly mostrarProducto = (
    valor: StockCelular | string | null
  ): string => {

    if (!valor) {
      return '';
    }

    if (typeof valor === 'string') {
      return valor;
    }

    return this.descripcionProducto(valor);

  };

  // =====================================================
  // BÚSQUEDA REMOTA DE CLIENTES
  // =====================================================

  private configurarBusquedaClientes(): void {

    this.clienteTexto.valueChanges
      .pipe(

        tap(valor => {

          if (typeof valor !== 'string') {
            return;
          }

          this.versionBusquedaCliente++;

          this.idCliente.set(0);
          this.clienteSeleccionado.set(null);

          const texto = valor.trim();

          this.busquedaCliente.set(texto.toUpperCase());
          this.clientes.set([]);
          this.clientesFiltrados.set([]);
          this.errorBusquedaClientes.set(false);
          this.buscandoClientes.set(texto.length >= 2);

        }),

        debounceTime(300),

        map(valor =>
          typeof valor === 'string'
            ? valor.trim()
            : ''
        ),

        distinctUntilChanged(),

        switchMap(texto => {

          const version = this.versionBusquedaCliente;

          if (this.clienteSeleccionado()) {
            this.buscandoClientes.set(false);
            return of<Cliente[]>([]);
          }

          if (texto.length < 2) {
            this.buscandoClientes.set(false);
            return of<Cliente[]>([]);
          }

          this.buscandoClientes.set(true);

          return this.clientesService
            .buscarParaAutocomplete(texto)
            .pipe(

              map(response => {

                if (version !== this.versionBusquedaCliente) {
                  return [];
                }

                return response.data ?? [];

              }),

              catchError(error => {

                if (version === this.versionBusquedaCliente) {

                  this.errorBusquedaClientes.set(true);

                  this.notify.error(
                    error?.error?.message ??
                    'No fue posible buscar los clientes'
                  );

                }

                return of<Cliente[]>([]);

              }),

              finalize(() => {

                if (version === this.versionBusquedaCliente) {
                  this.buscandoClientes.set(false);
                }

              })

            );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(clientes => {

        if (this.clienteSeleccionado()) {
          return;
        }

        this.clientes.set(clientes);
        this.clientesFiltrados.set(clientes);

      });

  }

  // =====================================================
  // BÚSQUEDA REMOTA DE CELULARES
  //
  // Máximo 25 resultados.
  // Solamente INGRESADO y factura = SI.
  //
  // Busca por IMEI, marca, modelo, RAM,
  // almacenamiento, color y términos combinados.
  // =====================================================

  private configurarBusquedaProductos(): void {

    this.productoTexto.valueChanges
      .pipe(

        tap(valor => {

          if (typeof valor !== 'string') {
            return;
          }

          this.versionBusquedaProducto++;

          const texto = valor
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 150);

          this.busquedaProducto.set(texto);

          this.stock.set([]);
          this.stockFiltrado.set([]);
          this.errorBusquedaProductos.set(false);

          this.buscandoProductos.set(texto.length >= 2);

        }),

        debounceTime(300),

        map(valor =>
          typeof valor === 'string'
            ? valor.trim().replace(/\s+/g, ' ').slice(0, 150)
            : ''
        ),

        distinctUntilChanged(),

        switchMap(texto => {

          const version = this.versionBusquedaProducto;

          if (texto.length < 2) {
            this.buscandoProductos.set(false);
            return of<StockCelular[]>([]);
          }

          this.buscandoProductos.set(true);

          return this.stockService
            .buscarParaAutocomplete(texto, 'SI')
            .pipe(

              map(response => {

                if (version !== this.versionBusquedaProducto) {
                  return [];
                }

                return (response.data ?? []).filter(
                  producto =>
                    String(producto.estado).toUpperCase() === 'INGRESADO' &&
                    String(producto.factura).toUpperCase() === 'SI'
                );

              }),

              catchError(error => {

                if (version === this.versionBusquedaProducto) {

                  this.errorBusquedaProductos.set(true);

                  this.notify.error(
                    error?.error?.message ??
                    'No fue posible buscar los equipos disponibles'
                  );

                }

                return of<StockCelular[]>([]);

              }),

              finalize(() => {

                if (version === this.versionBusquedaProducto) {
                  this.buscandoProductos.set(false);
                }

              })

            );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(productos => {

        this.stock.set(productos);
        this.filtrarProductos();

      });

  }

  // =====================================================
  // CARGAR DATOS INICIALES
  //
  // No descarga todos los clientes ni celulares.
  // =====================================================

  private cargarDatos(): void {

    this.cargando.set(true);

    this.cargarStock();

    this.facturasService.obtenerIva()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.ivaPorcentaje.set(
            Number(response.data.iva)
          );

        },

        error: () => {

          this.notify.error(
            'No fue posible obtener el IVA'
          );

        }

      });

  }

  // =====================================================
  // DESCRIPCIÓN DE CLIENTE
  // =====================================================

  descripcionCliente(cliente: Cliente): string {

    return `${cliente.identificacion} - ${cliente.nombreCliente}`;

  }

  // =====================================================
  // DESCRIPCIÓN DE PRODUCTO
  // =====================================================

  descripcionProducto(stock: StockCelular): string {

    return (
      `${stock.imei1} - ${stock.nombreMarca} ` +
      `${stock.nombreModelo} / ${stock.ram} RAM / ` +
      `${stock.almacenamiento} GB / ${stock.color}`
    );

  }

  // =====================================================
  // SELECCIONAR CLIENTE
  // =====================================================

  seleccionarCliente(cliente: Cliente): void {

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

  // =====================================================
  // ESTABLECER CLIENTE
  // =====================================================

  private establecerCliente(cliente: Cliente): void {

    this.versionBusquedaCliente++;

    this.idCliente.set(Number(cliente.id));
    this.clienteSeleccionado.set(cliente);
    this.busquedaCliente.set(cliente.identificacion);

    this.clientes.set([cliente]);
    this.clientesFiltrados.set([]);

    this.buscandoClientes.set(false);
    this.errorBusquedaClientes.set(false);

    this.clienteTexto.setValue(
      cliente,
      { emitEvent: false }
    );

  }

  // =====================================================
  // ACTUALIZAR CLIENTE
  // =====================================================

  actualizarCliente(): void {

    const cliente = this.clienteSeleccionado();

    if (!cliente) {
      return;
    }

    this.dialog.open(
      ClienteDialog,
      {
        width: '600px',
        maxWidth: '94vw',
        disableClose: true,
        data: { cliente }
      }
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(guardado => {

        if (!guardado) {
          return;
        }

        this.clientesService.obtenerPorId(cliente.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({

            next: response => {

              const actualizado = response.data;

              if (!actualizado) {

                this.notify.error(
                  'No se encontraron los datos del cliente actualizado'
                );

                return;

              }

              this.establecerCliente(actualizado);

            },

            error: () => {

              this.notify.error(
                'Cliente actualizado, pero no fue posible refrescar sus datos'
              );

            }

          });

      });

  }

  // =====================================================
  // REGISTRAR CLIENTE
  // =====================================================

  registrarCliente(): void {

    if (!this.puedeRegistrarCliente()) {
      return;
    }

    const identificacion = this.busquedaCliente();

    this.dialog.open(
      ClienteDialog,
      {
        width: '600px',
        maxWidth: '94vw',
        disableClose: true,
        data: {
          identificacionInicial: identificacion
        }
      }
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {

        if (!resultado || resultado === true) {
          return;
        }

        this.establecerCliente(resultado as Cliente);

      });

  }

  // =====================================================
  // SELECCIONAR PRODUCTO
  //
  // Recibe el objeto StockCelular, no su descripción.
  // =====================================================

  seleccionarProducto(producto: StockCelular): void {

    if (
      !producto ||
      !Number.isSafeInteger(Number(producto.id)) ||
      Number(producto.id) <= 0
    ) {

      this.notify.warning(
        'Seleccione un equipo válido'
      );

      return;

    }

    if (
      String(producto.estado).trim().toUpperCase() !== 'INGRESADO' ||
      String(producto.factura).trim().toUpperCase() !== 'SI'
    ) {

      this.notify.warning(
        'Este equipo no está disponible para facturación'
      );

      return;

    }

    if (this.detalle().some(x => x.id === producto.id)) {

      this.notify.warning(
        'Este equipo ya fue agregado'
      );

      this.limpiarBusquedaProducto();

      return;

    }

    this.detalle.update(actual => [
      ...actual,
      {
        ...producto,
        precioTotal: Number(producto.precioVenta)
      }
    ]);

    this.limpiarBusquedaProducto();

  }

  // =====================================================
  // LIMPIAR AUTOCOMPLETE DE PRODUCTOS
  // =====================================================

  private limpiarBusquedaProducto(): void {

    this.versionBusquedaProducto++;

    this.productoTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.busquedaProducto.set('');
    this.stock.set([]);
    this.stockFiltrado.set([]);
    this.buscandoProductos.set(false);
    this.errorBusquedaProductos.set(false);

  }

  // =====================================================
  // EXCLUIR EQUIPOS YA SELECCIONADOS
  //
  // Trabaja solo con los resultados de SQL Server.
  // =====================================================

  private filtrarProductos(): void {

    const seleccionados = new Set(
      this.detalle().map(x => Number(x.id))
    );

    this.stockFiltrado.set(
      this.stock().filter(
        producto => !seleccionados.has(Number(producto.id))
      )
    );

  }

  // =====================================================
  // ACTUALIZAR PRECIO
  // =====================================================

  actualizarPrecio(id: number, value: string): void {

    const texto = value.trim();

    const precio = texto === ''
      ? NaN
      : Number(texto);

    this.detalle.update(actual =>
      actual.map(producto =>
        producto.id === id
          ? { ...producto, precioTotal: precio }
          : producto
      )
    );

  }

  // =====================================================
  // ELIMINAR PRODUCTO DEL DETALLE
  // =====================================================

  eliminarProducto(producto: ProductoFactura): void {

    this.detalle.update(actual =>
      actual.filter(x => x.id !== producto.id)
    );

    this.filtrarProductos();

  }

  // =====================================================
  // VALIDAR FACTURACIÓN
  // =====================================================

  facturar(): void {

    if (this.facturando()) {
      return;
    }

    if (!this.idCliente()) {
      this.notify.warning('Seleccione un cliente');
      return;
    }

    if (!this.detalle().length) {
      this.notify.warning('Agregue por lo menos un equipo');
      return;
    }

    const precioInvalido = this.detalle().find(
      x =>
        !Number.isFinite(Number(x.precioTotal)) ||
        Number(x.precioTotal) < Number(x.precioCosto)
    );

    if (precioInvalido) {

      this.notify.error(
        `El precio del IMEI ${precioInvalido.imei1} no puede ser menor al costo`
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
          title: 'Confirmar factura',
          message:
            `Se generará la factura por ` +
            `${this.formatearTotal(this.total())}. ` +
            `¿Desea continuar?`,
          confirmText: 'Facturar'
        }
      }
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {

        if (confirmado) {
          this.generarFactura();
        }

      });

  }

  // =====================================================
  // GENERAR FACTURA
  // =====================================================

  private generarFactura(): void {

    const data = {

      idCliente: this.idCliente(),

      detalle: this.detalle().map(x => ({
        idProducto: x.id,
        precioTotal: Number(x.precioTotal)
      }))

    };

    this.facturando.set(true);

    this.facturasService.crear(data)
      .pipe(
        finalize(() => this.facturando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          const idFactura = response.data.idFactura;

          this.notify.success(
            `${response.message} - N.º ${idFactura}`
          );

          this.limpiar();
          this.visualizarFactura(idFactura);

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible generar la factura'
          );

        }

      });

  }

  // =====================================================
  // PRECARGAR STOCK DESDE INVENTARIO
  //
  // GET /api/stock-celulares/disponibles/:id?factura=SI
  //
  // No descarga el inventario completo.
  // Solo se realiza una vez al abrir el formulario.
  // =====================================================

  private cargarStock(): void {

    if (this.precargaProductoProcesada) {
      return;
    }

    this.precargaProductoProcesada = true;

    const idParametro =
      this.route.snapshot.queryParamMap.get('productoId');

    if (idParametro === null) {
      return;
    }

    const idProducto = Number(idParametro);

    if (
      !/^\d+$/.test(idParametro) ||
      !Number.isSafeInteger(idProducto) ||
      idProducto <= 0
    ) {

      this.notify.warning(
        'El identificador del equipo no es válido'
      );

      return;

    }

    this.stockService
      .obtenerDisponiblePorId(idProducto, 'SI')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: response => {

          const producto = response.data;

          if (!producto) {

            this.notify.warning(
              'El equipo no está disponible para facturación'
            );

            return;

          }

          this.seleccionarProducto(producto);

        },

        error: error => {

          this.notify.warning(
            error?.error?.message ??
            'El equipo no está disponible para facturación'
          );

        }

      });

  }

  // =====================================================
  // LIMPIAR FORMULARIO
  // =====================================================

  private limpiar(): void {

    this.versionBusquedaCliente++;

    this.idCliente.set(0);
    this.clienteSeleccionado.set(null);
    this.detalle.set([]);

    this.clienteTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.busquedaCliente.set('');
    this.clientes.set([]);
    this.clientesFiltrados.set([]);
    this.buscandoClientes.set(false);
    this.errorBusquedaClientes.set(false);

    this.limpiarBusquedaProducto();

  }

  // =====================================================
  // FORMATEAR TOTAL
  // =====================================================

  private formatearTotal(valor: number): string {

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(valor);

  }

  // =====================================================
  // VISUALIZAR FACTURA
  // =====================================================

  private visualizarFactura(idFactura: number): void {

    this.dialog.open(FacturaDetalleComponent, {
      width: '430px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: { idFactura }
    });

  }

}
