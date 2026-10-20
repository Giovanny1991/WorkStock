
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

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Cliente } from '../../clientes/cliente.model';
import { ClientesService } from '../../clientes/clientes.service';
import { ClienteDialog } from '../../clientes/cliente-dialog/cliente-dialog';

import { AccesorioStock } from '../../accesorios-stock/accesorio-stock.model';
import { AccesoriosStockService } from '../../accesorios-stock/accesorios-stock.service';

import { AuthService } from '../../../core/auth/auth.service';
import { AccesoriosNotasVentaService } from '../accesorios-notas-venta.service';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { AccesorioNotaDetalle } from '../accesorio-nota-detalle/accesorio-nota-detalle';

// =====================================================
// PRODUCTO VENTA
// =====================================================

interface ProductoVenta {
  id: number;
  accesorio: string;
  calidad: string;
  cantidadStock: number;
  precioCosto: number;
  pvp1: number;
  pvp2: number;
  cantidad: number;
  precioUnitario: number;
}

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-nueva-nota-accesorios',
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
  templateUrl: './nueva-nota-accesorios.html',
  styleUrl: './nueva-nota-accesorios.scss'
})
export class NuevaNotaAccesorios implements OnInit {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly clientesService = inject(ClientesService);
  private readonly stockService = inject(AccesoriosStockService);
  private readonly service = inject(AccesoriosNotasVentaService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // ===================================================
  // PERMISOS
  // ===================================================

  readonly esAdministrador = computed(() =>
    this.auth.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  // ===================================================
  // ESTADO GENERAL
  // ===================================================

  readonly cargando = signal(false);
  readonly guardando = signal(false);

  // ===================================================
  // CLIENTES
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
  // ACCESORIOS - AUTOCOMPLETE REMOTO
  // ===================================================

  readonly accesorios = signal<AccesorioStock[]>([]);
  readonly accesoriosFiltrados = signal<AccesorioStock[]>([]);

  readonly buscandoAccesorios = signal(false);
  readonly errorBusquedaAccesorios = signal(false);
  readonly busquedaAccesorio = signal('');

  readonly productoTexto = new FormControl<string | AccesorioStock>(
    '',
    { nonNullable: true }
  );

  private versionBusquedaAccesorio = 0;

  // ===================================================
  // DETALLE
  // ===================================================

  readonly detalle = signal<ProductoVenta[]>([]);

  // ===================================================
  // COLUMNAS
  // ===================================================

  readonly displayedColumns = computed(() => {

    const columnas = ['producto', 'stock'];

    if (this.esAdministrador()) {
      columnas.push('costo');
    }

    columnas.push(
      'pvp1',
      'cantidad',
      'precio',
      'total',
      'acciones'
    );

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
  // TOTALES
  // ===================================================

  readonly total = computed(() =>
    this.detalle().reduce(
      (total, producto) => total + this.totalProducto(producto),
      0
    )
  );

  readonly totalProductos = computed(() =>
    this.detalle().length
  );

  readonly totalUnidades = computed(() =>
    this.detalle().reduce(
      (total, producto) =>
        total + Number(producto.cantidad || 0),
      0
    )
  );

  // ===================================================
  // VALIDACIÓN GENERAL
  // ===================================================

  readonly puedeGenerar = computed(() =>
    this.idCliente() > 0 &&
    this.detalle().length > 0 &&
    this.detalle().every(producto => {

      const cantidad = Number(producto.cantidad);
      const precio = Number(producto.precioUnitario);
      const costo = Number(producto.precioCosto);
      const pvp1 = Number(producto.pvp1);

      return (
        Number.isSafeInteger(cantidad) &&
        cantidad > 0 &&
        cantidad <= Number(producto.cantidadStock) &&
        Number.isFinite(precio) &&
        Number.isFinite(costo) &&
        Number.isFinite(pvp1) &&
        precio > 0 &&
        precio >= costo &&
        precio >= pvp1
      );

    })
  );

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  ngOnInit(): void {

    this.configurarBusquedaClientes();
    this.configurarBusquedaAccesorios();
    this.cargarDatos();

  }

  // ===================================================
  // DISPLAY WITH CLIENTE
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
  // DISPLAY WITH ACCESORIO
  // ===================================================

  readonly mostrarAccesorio = (
    valor: AccesorioStock | string | null
  ): string => {

    if (!valor) {
      return '';
    }

    return typeof valor === 'string'
      ? valor
      : this.descripcionAccesorio(valor);

  };

  // ===================================================
  // BÚSQUEDA REMOTA DE CLIENTES
  //
  // Se conserva el funcionamiento original.
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
  // BÚSQUEDA REMOTA DE ACCESORIOS
  //
  // Solo:
  // - ACTIVO
  // - cantidadStock > 0
  // - empresa autenticada
  //
  // Hasta 25 coincidencias por consulta.
  // ===================================================

  private configurarBusquedaAccesorios(): void {

    this.productoTexto.valueChanges
      .pipe(

        tap(valor => {

          if (typeof valor !== 'string') {
            return;
          }

          this.versionBusquedaAccesorio++;

          const texto = valor
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 100);

          this.busquedaAccesorio.set(texto);

          this.accesorios.set([]);
          this.accesoriosFiltrados.set([]);

          this.errorBusquedaAccesorios.set(false);
          this.buscandoAccesorios.set(texto.length >= 2);

        }),

        debounceTime(300),

        map(valor =>
          typeof valor === 'string'
            ? valor.trim().replace(/\s+/g, ' ').slice(0, 100)
            : ''
        ),

        distinctUntilChanged(),

        switchMap(texto => {

          const version = this.versionBusquedaAccesorio;

          if (texto.length < 2) {
            this.buscandoAccesorios.set(false);
            return of<AccesorioStock[]>([]);
          }

          this.buscandoAccesorios.set(true);

          return this.stockService
            .buscarParaAutocomplete(texto)
            .pipe(

              map(response => {

                if (version !== this.versionBusquedaAccesorio) {
                  return [];
                }

                return (response.data ?? []).filter(
                  accesorio =>
                    String(accesorio.estado)
                      .trim()
                      .toUpperCase() === 'ACTIVO' &&
                    Number(accesorio.cantidadStock) > 0
                );

              }),

              catchError(error => {

                if (version === this.versionBusquedaAccesorio) {

                  this.errorBusquedaAccesorios.set(true);

                  this.notify.error(
                    error?.error?.message ??
                    'No fue posible buscar los accesorios disponibles'
                  );

                }

                return of<AccesorioStock[]>([]);

              }),

              finalize(() => {

                if (version === this.versionBusquedaAccesorio) {
                  this.buscandoAccesorios.set(false);
                }

              })

            );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(accesorios => {

        this.accesorios.set(accesorios);
        this.filtrarAccesorios();

      });

  }

  // ===================================================
  // CARGAR DATOS
  //
  // No se descarga todo el inventario.
  // Los resultados se consultan al escribir.
  // ===================================================

  private cargarDatos(): void {

    this.cargando.set(false);

  }

  // ===================================================
  // DESCRIPCIÓN DE CLIENTE
  // ===================================================

  descripcionCliente(cliente: Cliente): string {

    return `${cliente.identificacion} - ${cliente.nombreCliente}`;

  }

  // ===================================================
  // DESCRIPCIÓN DE ACCESORIO
  // ===================================================

  descripcionAccesorio(accesorio: AccesorioStock): string {

    return `${accesorio.accesorio} / ${accesorio.calidad}`;

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
  // ESTABLECER CLIENTE
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

  // ===================================================
  // ACTUALIZAR CLIENTE
  // ===================================================

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

  // ===================================================
  // SELECCIONAR ACCESORIO
  //
  // Recibe el objeto seleccionado, no una descripción.
  // ===================================================

  seleccionarAccesorio(accesorio: AccesorioStock): void {

    if (
      !accesorio ||
      !Number.isSafeInteger(Number(accesorio.id)) ||
      Number(accesorio.id) <= 0
    ) {

      this.notify.warning(
        'Seleccione un accesorio válido'
      );

      return;

    }

    if (
      String(accesorio.estado)
        .trim()
        .toUpperCase() !== 'ACTIVO'
    ) {

      this.notify.warning(
        'Este accesorio no está activo'
      );

      this.limpiarBusquedaAccesorio();
      return;

    }

    if (Number(accesorio.cantidadStock) <= 0) {

      this.notify.warning(
        'El accesorio no tiene stock disponible'
      );

      this.limpiarBusquedaAccesorio();
      return;

    }

    if (
      this.detalle().some(
        item => Number(item.id) === Number(accesorio.id)
      )
    ) {

      this.notify.warning('Este accesorio ya fue agregado');

      this.limpiarBusquedaAccesorio();
      return;

    }

    this.detalle.update(actual => [
      ...actual,
      {
        id: accesorio.id,
        accesorio: accesorio.accesorio,
        calidad: accesorio.calidad,
        cantidadStock: Number(accesorio.cantidadStock),
        precioCosto: Number(accesorio.precioUnitario),
        pvp1: Number(accesorio.pvp1),
        pvp2: Number(accesorio.pvp2),
        cantidad: 1,
        precioUnitario: Number(accesorio.pvp2)
      }
    ]);

    this.limpiarBusquedaAccesorio();

  }

  // ===================================================
  // LIMPIAR AUTOCOMPLETE
  // ===================================================

  private limpiarBusquedaAccesorio(): void {

    this.versionBusquedaAccesorio++;

    this.productoTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.busquedaAccesorio.set('');

    this.accesorios.set([]);
    this.accesoriosFiltrados.set([]);

    this.buscandoAccesorios.set(false);
    this.errorBusquedaAccesorios.set(false);

  }

  // ===================================================
  // EXCLUIR ACCESORIOS AGREGADOS
  //
  // Solo trabaja con la página recibida desde SQL.
  // ===================================================

  private filtrarAccesorios(): void {

    const seleccionados = new Set(
      this.detalle().map(producto => Number(producto.id))
    );

    this.accesoriosFiltrados.set(
      this.accesorios().filter(
        accesorio =>
          !seleccionados.has(Number(accesorio.id))
      )
    );

  }

  // ===================================================
  // ACTUALIZAR CANTIDAD
  // ===================================================

  actualizarCantidad(id: number, value: string): void {

    const texto = value.trim();

    const cantidad = texto === ''
      ? NaN
      : Number(texto);

    this.detalle.update(actual =>
      actual.map(producto =>
        producto.id === id
          ? { ...producto, cantidad }
          : producto
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
          ? { ...producto, precioUnitario: precio }
          : producto
      )
    );

  }

  // ===================================================
  // TOTAL POR PRODUCTO
  // ===================================================

  totalProducto(producto: ProductoVenta): number {

    return (
      Number(producto.cantidad || 0) *
      Number(producto.precioUnitario || 0)
    );

  }

  // ===================================================
  // NIVEL DE PRECIO
  //
  // PVP1 es el mínimo permitido.
  // ===================================================

  nivelPrecio(
    producto: ProductoVenta
  ): 'normal' | 'warning' | 'danger' {

    const precio = Number(producto.precioUnitario);
    const costo = Number(producto.precioCosto);
    const pvp1 = Number(producto.pvp1);

    if (
      !Number.isFinite(precio) ||
      !Number.isFinite(costo) ||
      !Number.isFinite(pvp1) ||
      precio <= 0 ||
      precio < costo ||
      precio < pvp1
    ) {

      return 'danger';

    }

    return 'normal';

  }

  // ===================================================
  // ELIMINAR PRODUCTO
  // ===================================================

  eliminarProducto(producto: ProductoVenta): void {

    this.detalle.update(actual =>
      actual.filter(item => item.id !== producto.id)
    );

    this.filtrarAccesorios();

  }

  // ===================================================
  // GENERAR NOTA
  // ===================================================

  generar(): void {

    if (this.guardando()) {
      return;
    }

    const error = this.validar();

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
          title: 'Confirmar nota de venta',

          message:
            `Se generará la nota de venta por ` +
            `${this.formatearTotal(this.total())}. ` +
            `¿Desea continuar?`,

          confirmText: 'Generar nota'
        }
      }
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {

        if (!confirmado || this.guardando()) {
          return;
        }

        this.guardarNota();

      });

  }

  // ===================================================
  // GUARDAR NOTA
  //
  // Se conserva el contrato del backend.
  // ===================================================

  private guardarNota(): void {

    this.guardando.set(true);

    this.service.crear({
      idCliente: this.idCliente(),

      detalle: this.detalle().map(producto => ({
        idProducto: producto.id,
        cantidad: Number(producto.cantidad),
        precioUnitario: Number(producto.precioUnitario)
      }))

    })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          const idNotaVenta = response.data.idNotaVenta;

          const numero =
            response.data.numeroNV ?? idNotaVenta;

          this.notify.success(
            `${response.message ?? 'Nota de venta generada correctamente'} - N.º ${numero}`
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
  // VISUALIZAR NOTA
  // ===================================================

  private visualizarNota(idNotaVenta: number): void {

    this.dialog.open(
      AccesorioNotaDetalle,
      {
        width: '520px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        disableClose: true,
        autoFocus: false,
        data: { idNotaVenta }
      }
    );

  }

  // ===================================================
  // VALIDAR
  //
  // Se conservan todas las reglas comerciales.
  // ===================================================

  private validar(): string | null {

    if (this.idCliente() <= 0) {
      return 'Seleccione un cliente';
    }

    if (this.detalle().length === 0) {
      return 'Agregue por lo menos un accesorio';
    }

    for (const producto of this.detalle()) {

      const cantidad = Number(producto.cantidad);

      if (
        !Number.isSafeInteger(cantidad) ||
        cantidad <= 0
      ) {

        return `Ingrese una cantidad válida para ${producto.accesorio}`;

      }

      if (cantidad > Number(producto.cantidadStock)) {

        return `La cantidad de ${producto.accesorio} supera el stock disponible`;

      }

      const precio = Number(producto.precioUnitario);

      if (
        !Number.isFinite(precio) ||
        precio <= 0
      ) {

        return `Ingrese un precio válido para ${producto.accesorio}`;

      }

      if (precio < Number(producto.precioCosto)) {

        return `El precio de ${producto.accesorio} no puede ser menor al costo`;

      }

      const pvp1 = Number(producto.pvp1);

      if (!Number.isFinite(pvp1)) {

        return `El accesorio ${producto.accesorio} no tiene PVP 1 (Locales) válido`;

      }

      if (precio < pvp1) {

        return (
          `El precio de ${producto.accesorio} ` +
          `no puede ser menor al PVP 1 (Locales): ` +
          `${this.formatearTotal(pvp1)}`
        );

      }

    }

    return null;

  }

  // ===================================================
  // LIMPIAR FORMULARIO
  // ===================================================

  private limpiar(): void {

    this.versionBusquedaCliente++;

    this.idCliente.set(0);
    this.clienteSeleccionado.set(null);
    this.detalle.set([]);

    this.busquedaCliente.set('');

    this.clienteTexto.setValue(
      '',
      { emitEvent: false }
    );

    this.clientes.set([]);
    this.clientesFiltrados.set([]);

    this.buscandoClientes.set(false);
    this.errorBusquedaClientes.set(false);

    this.limpiarBusquedaAccesorio();

  }

  // ===================================================
  // FORMATO MONEDA
  // ===================================================

  private formatearTotal(valor: number): string {

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(valor);

  }

}
