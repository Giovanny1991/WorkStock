
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

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { NotaVentaDetalleComponent } from '../nota-venta-detalle/nota-venta-detalle';

// =====================================================
// PRODUCTO SELECCIONADO
// =====================================================

interface ProductoNotaVenta extends StockCelular {
  precioTotal: number;
}

// =====================================================
// COMPONENTE
// =====================================================

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

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly auth = inject(AuthService);
  private readonly clientesService = inject(ClientesService);
  private readonly stockService = inject(StockCelularesService);
  private readonly notasService = inject(NotasVentaService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // ===================================================
  // PERMISOS
  // ===================================================

  readonly esAdministrador = computed(() =>
    this.auth.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  // ===================================================
  // ESTADO
  // ===================================================

  readonly cargando = signal(false);
  readonly guardando = signal(false);

  // ===================================================
  // CLIENTES - BÚSQUEDA REMOTA
  // ===================================================

  readonly clientes = signal<Cliente[]>([]);
  readonly clientesFiltrados = signal<Cliente[]>([]);

  readonly buscandoClientes = signal(false);
  readonly errorBusquedaClientes = signal(false);

  readonly idCliente = signal(0);
  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly busquedaCliente = signal('');

  readonly clienteTexto = new FormControl<string | Cliente>(
    '',
    { nonNullable: true }
  );

  private versionBusquedaCliente = 0;

  // ===================================================
  // EQUIPOS - BÚSQUEDA REMOTA
  //
  // Solamente factura = NO y estado INGRESADO.
  // ===================================================

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

  // ===================================================
  // DETALLE
  // ===================================================

  readonly detalle = signal<ProductoNotaVenta[]>([]);

  // ===================================================
  // COLUMNAS
  // ===================================================

  readonly displayedColumns = computed(() => {
    const columnas = ['producto', 'imei'];

    columnas.push('precio', 'acciones');
    return columnas;
  });

  // ===================================================
  // CLIENTE EXISTENTE ENTRE RESULTADOS
  // ===================================================

  readonly clienteExiste = computed(() => {
    const identificacion = this.busquedaCliente()
      .trim()
      .toUpperCase();

    return this.clientes().some(
      cliente =>
        cliente.identificacion.toUpperCase() === identificacion
    );
  });

  // ===================================================
  // PERMITIR REGISTRAR CLIENTE
  // ===================================================

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

  // ===================================================
  // TOTAL
  // ===================================================

  readonly total = computed(() =>
    this.detalle().reduce(
      (total, producto) =>
        total + Number(producto.precioTotal || 0),
      0
    )
  );

  // ===================================================
  // VALIDACIÓN GENERAL
  // ===================================================

  readonly puedeGuardar = computed(() =>
    this.idCliente() > 0 &&
    this.detalle().length > 0 &&
    this.detalle().every(
      producto => !this.precioInvalido(producto)
    )
  );

  // ===================================================
  // INICIALIZAR
  // ===================================================

  ngOnInit(): void {
    this.configurarBusquedaClientes();
    this.configurarBusquedaProductos();
    this.cargarDatos();
  }

  // ===================================================
  // MOSTRAR CLIENTE EN EL INPUT
  // ===================================================

  readonly mostrarCliente = (
    valor: Cliente | string | null
  ): string => {
    if (!valor) {
      return '';
    }

    return typeof valor === 'string'
      ? valor
      : this.descripcionCliente(valor);
  };

  // ===================================================
  // MOSTRAR PRODUCTO EN EL INPUT
  //
  // Evita mostrar el ID o [object Object].
  // ===================================================

  readonly mostrarProducto = (
    valor: StockCelular | string | null
  ): string => {
    if (!valor) {
      return '';
    }

    return typeof valor === 'string'
      ? valor
      : this.descripcionProducto(valor);
  };

  // ===================================================
  // BUSCADOR REMOTO DE CLIENTES
  //
  // Se conserva la lógica original.
  // ===================================================

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

  // ===================================================
  // NUEVO: BUSCADOR REMOTO DE CELULARES
  //
  // Busca por:
  // - IMEI
  // - Proveedor
  // - Marca
  // - Modelo
  // - RAM
  // - Almacenamiento
  // - Color
  //
  // Acepta palabras combinadas y consulta
  // únicamente 25 registros por solicitud.
  // ===================================================

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
            .buscarParaAutocomplete(texto, 'NO')
            .pipe(
              map(response => {
                if (version !== this.versionBusquedaProducto) {
                  return [];
                }

                return (response.data ?? []).filter(
                  producto =>
                    String(producto.estado)
                      .trim()
                      .toUpperCase() === 'INGRESADO' &&
                    String(producto.factura)
                      .trim()
                      .toUpperCase() === 'NO'
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

  // ===================================================
  // CARGAR DATOS INICIALES
  //
  // No descarga clientes ni inventario completo.
  // ===================================================

  private cargarDatos(): void {
    this.cargarStock();
  }

  // ===================================================
  // DESCRIPCIÓN DEL CLIENTE
  // ===================================================

  descripcionCliente(cliente: Cliente): string {
    return `${cliente.identificacion} - ${cliente.nombreCliente}`;
  }

  // ===================================================
  // DESCRIPCIÓN DEL EQUIPO
  // ===================================================

  descripcionProducto(stock: StockCelular): string {
    return (
      `${stock.imei1} - ${stock.nombreMarca} ` +
      `${stock.nombreModelo} / ${stock.ram} RAM / ` +
      `${stock.almacenamiento} GB / ${stock.color}`
    );
  }

  // ===================================================
  // SELECCIONAR CLIENTE
  // ===================================================

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

  // ===================================================
  // ESTABLECER CLIENTE SELECCIONADO
  // ===================================================

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

  // ===================================================
  // REGISTRAR CLIENTE
  // ===================================================

  registrarCliente(): void {
    if (!this.puedeRegistrarCliente()) {
      return;
    }

    const identificacion = this.busquedaCliente();

    this.dialog.open(ClienteDialog, {
      width: '600px',
      maxWidth: '94vw',
      disableClose: true,
      data: {
        identificacionInicial: identificacion
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (!resultado || resultado === true) {
          return;
        }

        this.establecerCliente(resultado as Cliente);
      });
  }

  // ===================================================
  // ACTUALIZAR CLIENTE
  // ===================================================

  actualizarCliente(): void {
    const cliente = this.clienteSeleccionado();

    if (!cliente) {
      return;
    }

    this.dialog.open(ClienteDialog, {
      width: '600px',
      maxWidth: '94vw',
      disableClose: true,
      data: { cliente }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(guardado => {
        if (!guardado) {
          return;
        }

        this.clientesService
          .obtenerPorId(cliente.id)
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

  // ===================================================
  // SELECCIONAR PRODUCTO
  //
  // Se selecciona el objeto StockCelular directamente.
  // Nunca se busca mediante la descripción.
  // ===================================================

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
      String(producto.estado)
        .trim()
        .toUpperCase() !== 'INGRESADO' ||
      String(producto.factura)
        .trim()
        .toUpperCase() !== 'NO'
    ) {
      this.notify.warning(
        'Este equipo no está disponible para nota de venta'
      );
      return;
    }

    if (this.detalle().some(item => item.id === producto.id)) {
      this.notify.warning('Este equipo ya fue agregado');
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

  // ===================================================
  // LIMPIAR BÚSQUEDA DE PRODUCTOS
  // ===================================================

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

  // ===================================================
  // EXCLUIR EQUIPOS YA AGREGADOS
  //
  // Solo filtra los resultados paginados recibidos.
  // ===================================================

  private filtrarProductos(): void {
    const seleccionados = new Set(
      this.detalle().map(item => Number(item.id))
    );

    this.stockFiltrado.set(
      this.stock().filter(
        producto => !seleccionados.has(Number(producto.id))
      )
    );
  }

  // ===================================================
  // ACTUALIZAR PRECIO
  // ===================================================

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

  // ===================================================
  // PRECIO INVÁLIDO
  // ===================================================

  precioInvalido(producto: ProductoNotaVenta): boolean {
    const precio = Number(producto.precioTotal);
    const costo = Number(producto.precioCosto);

    return (
      !Number.isFinite(precio) ||
      precio < 0 ||
      precio < costo
    );
  }

  // ===================================================
  // QUITAR PRODUCTO DEL DETALLE
  // ===================================================

  eliminarProducto(producto: ProductoNotaVenta): void {
    this.detalle.update(actual =>
      actual.filter(item => item.id !== producto.id)
    );

    this.filtrarProductos();
  }

  // ===================================================
  // VALIDAR Y CONFIRMAR NOTA
  // ===================================================

  guardar(): void {
    if (this.guardando()) {
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

    const productoInvalido = this.detalle().find(
      producto => this.precioInvalido(producto)
    );

    if (productoInvalido) {
      this.notify.error(
        `Ingrese un precio de venta válido para el IMEI ` +
        `${productoInvalido.imei1}. ` +
        `El precio no puede estar vacío, ser negativo ni ser menor al costo.`
      );
      return;
    }

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Confirmar nota de venta',
        message:
          `Se generará la nota de venta por ` +
          `${this.formatearTotal(this.total())}. ` +
          `¿Desea continuar?`,
        confirmText: 'Generar nota'
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.generarNota();
        }
      });
  }

  // ===================================================
  // GENERAR NOTA DE VENTA
  // ===================================================

  private generarNota(): void {
    const data = {
      idCliente: this.idCliente(),

      detalle: this.detalle().map(producto => ({
        idProducto: producto.id,
        precioTotal: Number(producto.precioTotal)
      }))
    };

    this.guardando.set(true);

    this.notasService
      .crear(data)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          const idNotaVenta = response.data.idNotaVenta;

          this.notify.success(
            `${response.message} - N.º ${idNotaVenta}`
          );

          this.limpiar();
          this.visualizarNota(idNotaVenta);
        },

        error: error => {
          this.notify.error(
            error?.error?.message ??
            'No fue posible generar la nota de venta'
          );
        }
      });
  }

  // ===================================================
  // VISUALIZAR COMPROBANTE
  // ===================================================

  private visualizarNota(idNotaVenta: number): void {
    this.dialog.open(NotaVentaDetalleComponent, {
      width: '430px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: {
        idNotaVenta
      }
    });
  }

  // ===================================================
  // PRECARGAR EQUIPO DESDE INVENTARIO
  //
  // GET /api/stock-celulares/disponibles/:id?factura=NO
  //
  // No descarga todos los equipos.
  // ===================================================

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

    this.cargando.set(true);

    this.stockService
      .obtenerDisponiblePorId(idProducto, 'NO')
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          const producto = response.data;

          if (!producto) {
            this.notify.warning(
              'El equipo no está disponible para nota de venta'
            );
            return;
          }

          this.seleccionarProducto(producto);
        },

        error: error => {
          this.notify.warning(
            error?.error?.message ??
            'El equipo no está disponible para nota de venta'
          );
        }
      });
  }

  // ===================================================
  // LIMPIAR DESPUÉS DE GUARDAR
  // ===================================================

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

  // ===================================================
  // FORMATEAR TOTAL
  // ===================================================

  private formatearTotal(valor: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(valor);
  }

}
