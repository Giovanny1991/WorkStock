import {

  Component,

  computed,

  inject,

  OnInit,

  signal

} from '@angular/core';

import {

  CurrencyPipe

} from '@angular/common';

import {

  FormControl,

  ReactiveFormsModule

} from '@angular/forms';

import {

  finalize,

  forkJoin

} from 'rxjs';

import {

  MatAutocompleteModule

} from '@angular/material/autocomplete';

import {

  MatButtonModule

} from '@angular/material/button';

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

  MatProgressBarModule

} from '@angular/material/progress-bar';

import {

  MatTableModule

} from '@angular/material/table';

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

  AccesorioStock

} from '../../accesorios-stock/accesorio-stock.model';

import {

  AccesoriosStockService

} from '../../accesorios-stock/accesorios-stock.service';

import { AuthService } from '../../../core/auth/auth.service';

import {

  AccesoriosNotasVentaService

} from '../accesorios-notas-venta.service';

import {

  NotificationService

} from '../../../core/services/notification';

import {

  ConfirmDialog

} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {

  AccesorioNotaDetalle

} from '../accesorio-nota-detalle/accesorio-nota-detalle';

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

@Component({

  selector:

    'app-nueva-nota-accesorios',

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

  templateUrl:

    './nueva-nota-accesorios.html',

  styleUrl:

    './nueva-nota-accesorios.scss'

})

export class NuevaNotaAccesorios

  implements OnInit {

  /* =====================================================

     SERVICIOS

  ===================================================== */

  private readonly clientesService =

    inject(ClientesService);

  private readonly stockService =

    inject(AccesoriosStockService);

  private readonly service =

    inject(

      AccesoriosNotasVentaService

    );

  private readonly notify =

    inject(NotificationService);

  private readonly dialog =

    inject(MatDialog);

  private readonly auth = inject(AuthService);

  // Ajustar el acceso a usuario() si AuthService expone otro nombre.
  readonly esAdministrador = computed(() =>
    this.auth.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  /* =====================================================

     ESTADO

  ===================================================== */

  readonly cargando =

    signal(false);

  readonly guardando =

    signal(false);

  readonly clientes =

    signal<Cliente[]>([]);

  readonly clientesFiltrados =

    signal<Cliente[]>([]);

  readonly accesorios =

    signal<AccesorioStock[]>([]);

  readonly accesoriosFiltrados =

    signal<AccesorioStock[]>([]);

  readonly detalle =

    signal<ProductoVenta[]>([]);

  /* =====================================================

     CLIENTE

  ===================================================== */

  readonly idCliente =

    signal(0);

  readonly clienteSeleccionado =

    signal<Cliente | null>(null);

  readonly busquedaCliente =

    signal('');

  readonly clienteTexto =

    new FormControl(

      '',

      {

        nonNullable: true

      }

    );

  /* =====================================================

     ACCESORIO

  ===================================================== */

  readonly productoTexto =

    new FormControl(

      '',

      {

        nonNullable: true

      }

    );

  /* =====================================================

     COLUMNAS

  ===================================================== */

  readonly displayedColumns = computed(() => {
    const columnas = ['producto', 'stock'];

    if (this.esAdministrador()) {
      columnas.push('costo');
    }

    columnas.push('pvp1', 'cantidad', 'precio', 'total', 'acciones');
    return columnas;
  });

  /* =====================================================

     CLIENTE EXISTENTE

  ===================================================== */

  readonly clienteExiste =

    computed(() =>

      this.clientes()

        .some(

          cliente =>

            cliente.identificacion

              .toUpperCase() ===

            this.busquedaCliente()

              .toUpperCase()

        )

    );

  /* =====================================================

     REGISTRAR CLIENTE

  ===================================================== */

  readonly puedeRegistrarCliente =

    computed(() => {

      const valor =

        this.busquedaCliente()

          .trim()

          .toUpperCase();

      const esCedula =

        /^\d{10}$/

          .test(valor);

      const esRuc =

        /^\d{13}$/

          .test(valor);

      const esPasaporte =

        /^P[A-Z0-9]{1,12}$/

          .test(valor);

      return (

        (

          esCedula ||

          esRuc ||

          esPasaporte

        )

        &&

        !this.clienteExiste()

        &&

        !this.clienteSeleccionado()

      );

    });

  /* =====================================================

     TOTAL

  ===================================================== */

  readonly total =

    computed(() =>

      this.detalle()

        .reduce(

          (

            total,

            producto

          ) =>

            total +

            this.totalProducto(

              producto

            ),

          0

        )

    );

  /* =====================================================

     TOTAL PRODUCTOS

  ===================================================== */

  readonly totalProductos =

    computed(() =>

      this.detalle().length

    );

  /* =====================================================

     TOTAL UNIDADES

  ===================================================== */

  readonly totalUnidades =

    computed(() =>

      this.detalle()

        .reduce(

          (

            total,

            producto

          ) =>

            total +

            Number(

              producto.cantidad ||

              0

            ),

          0

        )

    );

  /* =====================================================

     PUEDE GENERAR

     Solo informativo.

     El botón no depende de esto para evitar quedar

     bloqueado sin explicar el motivo.

  ===================================================== */

  readonly puedeGenerar = computed(() =>
    this.idCliente() > 0 &&
    this.detalle().length > 0 &&
    this.detalle().every(producto => {
      const cantidad = Number(producto.cantidad);
      const precio = Number(producto.precioUnitario);
      const costo = Number(producto.precioCosto);
      const pvp1 = Number(producto.pvp1);

      return Number.isInteger(cantidad) &&
        cantidad > 0 &&
        cantidad <= Number(producto.cantidadStock) &&
        Number.isFinite(precio) &&
        Number.isFinite(costo) &&
        Number.isFinite(pvp1) &&
        precio > 0 &&
        precio >= costo &&
        precio >= pvp1;
    })
  );

  /* =====================================================

     INICIO

  ===================================================== */

  ngOnInit(): void {

    this.cargarDatos();

    /* ===================================================

       BÚSQUEDA CLIENTE

    =================================================== */

    this.clienteTexto

      .valueChanges

      .subscribe(value => {

        this.idCliente.set(0);

        this.clienteSeleccionado

          .set(null);

        const texto =

          value

            .trim()

            .toLowerCase();

        this.busquedaCliente

          .set(

            value

              .trim()

              .toUpperCase()

          );

        this.clientesFiltrados

          .set(

            this.clientes()

              .filter(

                cliente =>

                  this.descripcionCliente(

                    cliente

                  )

                    .toLowerCase()

                    .includes(

                      texto

                    )

              )

          );

      });

    /* ===================================================

       BÚSQUEDA ACCESORIO

    =================================================== */

    this.productoTexto

      .valueChanges

      .subscribe(value => {

        this.filtrarAccesorios(

          value

            .trim()

            .toLowerCase()

        );

      });

  }

  /* =====================================================

     CARGAR DATOS

  ===================================================== */

  private cargarDatos(): void {

    this.cargando.set(true);

    forkJoin({

      clientes:

        this.clientesService

          .listar(),

      accesorios:

        this.stockService

          .listar()

    })

      .pipe(

        finalize(

          () =>

            this.cargando.set(false)

        )

      )

      .subscribe({

        next: response => {

          /* CLIENTES */

          const clientes =

            response.clientes

              .data ??

            [];

          this.clientes.set(

            clientes

          );

          this.clientesFiltrados

            .set(

              clientes

            );

          /* ACCESORIOS */

          const accesorios =

            (

              response.accesorios

                .data ??

              []

            )

              .filter(

                accesorio =>

                  String(

                    accesorio.estado

                  )

                    .trim()

                    .toUpperCase() ===

                  'ACTIVO'

                  &&

                  Number(

                    accesorio.cantidadStock

                  ) > 0

              );

          this.accesorios.set(

            accesorios

          );

          this.accesoriosFiltrados

            .set(

              accesorios

            );

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible cargar la información'

          );

        }

      });

  }

  /* =====================================================

     CARGAR CLIENTES

  ===================================================== */

  private cargarClientes(): void {

    this.clientesService

      .listar()

      .subscribe({

        next: response => {

          const clientes =

            response.data ?? [];

          this.clientes.set(

            clientes

          );

          this.clientesFiltrados

            .set(

              clientes

            );

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible actualizar los clientes'

          );

        }

      });

  }

  /* =====================================================

     ACTUALIZAR STOCK

  ===================================================== */

  private cargarStock(): void {

    this.stockService

      .listar()

      .subscribe({

        next: response => {

          const accesorios =

            (

              response.data ??

              []

            )

              .filter(

                accesorio =>

                  String(

                    accesorio.estado

                  )

                    .trim()

                    .toUpperCase() ===

                  'ACTIVO'

                  &&

                  Number(

                    accesorio.cantidadStock

                  ) > 0

              );

          this.accesorios.set(

            accesorios

          );

          this.filtrarAccesorios(

            ''

          );

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible actualizar el stock'

          );

        }

      });

  }

  /* =====================================================

     DESCRIPCIÓN CLIENTE

  ===================================================== */

  descripcionCliente(

    cliente: Cliente

  ): string {

    return (

      `${cliente.identificacion} - ${cliente.nombreCliente}`

    );

  }

  /* =====================================================

     SELECCIONAR CLIENTE

  ===================================================== */

  seleccionarCliente(

    descripcion: string

  ): void {

    const cliente =

      this.clientes()

        .find(

          item =>

            this.descripcionCliente(

              item

            ) ===

            descripcion

        );

    if (!cliente) {

      return;

    }

    this.idCliente.set(

      cliente.id

    );

    this.clienteSeleccionado

      .set(

        cliente

      );

    this.busquedaCliente

      .set(

        cliente.identificacion

      );

    this.clienteTexto

      .setValue(

        this.descripcionCliente(

          cliente

        ),

        {

          emitEvent: false

        }

      );

  }

  /* =====================================================

     REGISTRAR CLIENTE

  ===================================================== */

  registrarCliente(): void {

    const identificacion =

      this.busquedaCliente();

    this.dialog.open(

      ClienteDialog,

      {

        width: '600px',

        maxWidth: '94vw',

        disableClose: true,

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

        this.clientes.update(

          actual => {

            const existe =

              actual.some(

                item =>

                  item.id ===

                  cliente.id

              );

            return existe

              ? actual

              : [

                ...actual,

                cliente

              ];

          }

        );

        this.idCliente.set(

          cliente.id

        );

        this.clienteSeleccionado

          .set(

            cliente

          );

        this.clienteTexto

          .setValue(

            this.descripcionCliente(

              cliente

            ),

            {

              emitEvent: false

            }

          );

        this.busquedaCliente

          .set(

            cliente.identificacion

          );

        this.clientesFiltrados

          .set(

            this.clientes()

          );

      });

  }

  /* =====================================================

     ACTUALIZAR CLIENTE

  ===================================================== */

  actualizarCliente(): void {

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

        data: {

          cliente

        }

      }

    )

      .afterClosed()

      .subscribe(guardado => {

        if (!guardado) {

          return;

        }

        this.clientesService

          .listar()

          .subscribe({

            next: response => {

              const clientes =

                response.data ?? [];

              this.clientes.set(

                clientes

              );

              this.clientesFiltrados

                .set(

                  clientes

                );

              const actualizado =

                clientes.find(

                  item =>

                    item.id ===

                    cliente.id

                );

              if (!actualizado) {

                return;

              }

              this.idCliente.set(

                actualizado.id

              );

              this.clienteSeleccionado

                .set(

                  actualizado

                );

              this.busquedaCliente

                .set(

                  actualizado.identificacion

                );

              this.clienteTexto

                .setValue(

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

  /* =====================================================

     DESCRIPCIÓN ACCESORIO

  ===================================================== */

  descripcionAccesorio(

    accesorio: AccesorioStock

  ): string {

    return (

      `${accesorio.accesorio} / ${accesorio.calidad}`

    );

  }

  /* =====================================================

     SELECCIONAR ACCESORIO

  ===================================================== */

  seleccionarAccesorio(

    descripcion: string

  ): void {

    const accesorio =

      this.accesorios()

        .find(

          item =>

            this.descripcionAccesorio(

              item

            ) ===

            descripcion

        );

    if (!accesorio) {

      return;

    }

    if (

      this.detalle()

        .some(

          item =>

            item.id ===

            accesorio.id

        )

    ) {

      this.notify.warning(

        'Este accesorio ya fue agregado'

      );

      return;

    }

    if (

      Number(

        accesorio.cantidadStock

      ) <= 0

    ) {

      this.notify.warning(

        'El accesorio no tiene stock disponible'

      );

      return;

    }

    this.detalle.update(

      actual => [

        ...actual,

        {

          id:

            accesorio.id,

          accesorio:

            accesorio.accesorio,

          calidad:

            accesorio.calidad,

          cantidadStock:

            Number(

              accesorio.cantidadStock

            ),

          precioCosto:

            Number(

              accesorio.precioUnitario

            ),

          pvp1:

            Number(

              accesorio.pvp1

            ),

          pvp2:

            Number(

              accesorio.pvp2

            ),

          cantidad:

            1,

          precioUnitario:

            Number(

              accesorio.pvp2

            )

        }

      ]

    );

    this.productoTexto

      .setValue(

        '',

        {

          emitEvent: false

        }

      );

    this.filtrarAccesorios(

      ''

    );

  }

  /* =====================================================

     FILTRAR ACCESORIOS

  ===================================================== */

  private filtrarAccesorios(

    texto: string

  ): void {

    const seleccionados =

      new Set(

        this.detalle()

          .map(

            producto =>

              producto.id

          )

      );

    this.accesoriosFiltrados

      .set(

        this.accesorios()

          .filter(

            accesorio => {

              if (

                seleccionados.has(

                  accesorio.id

                )

              ) {

                return false;

              }

              return (

                this.descripcionAccesorio(

                  accesorio

                )

                  .toLowerCase()

                  .includes(

                    texto

                  )

                ||

                String(

                  accesorio.categoria ??

                  ''

                )

                  .toLowerCase()

                  .includes(

                    texto

                  )

                ||

                String(

                  accesorio.nombreMarca ??

                  ''

                )

                  .toLowerCase()

                  .includes(

                    texto

                  )

              );

            }

          )

      );

  }

  /* =====================================================

     ACTUALIZAR CANTIDAD

  ===================================================== */

  actualizarCantidad(id: number, value: string): void {

    const texto = value.trim();

    const cantidad = texto === ''

      ? NaN

      : Number(texto);

    this.detalle.update(actual =>

      actual.map(producto =>

        producto.id === id

          ? {

            ...producto,

            cantidad

          }

          : producto

      )

    );

  }

  /* =====================================================

     ACTUALIZAR PRECIO

  ===================================================== */

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

            precioUnitario: precio

          }

          : producto

      )

    );

  }

  /* =====================================================

     TOTAL POR PRODUCTO

  ===================================================== */

  totalProducto(

    producto: ProductoVenta

  ): number {

    return (

      Number(

        producto.cantidad ||

        0

      )

      *

      Number(

        producto.precioUnitario ||

        0

      )

    );

  }

  /* =====================================================

     NIVEL PRECIO

  ===================================================== */

  nivelPrecio(
    producto: ProductoVenta
  ): 'normal' | 'warning' | 'danger' {
    const precio = Number(producto.precioUnitario);
    const costo = Number(producto.precioCosto);
    const pvp1 = Number(producto.pvp1);

    // PVP 1 (Locales) es el precio mínimo autorizado.
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

  /* =====================================================

     ELIMINAR PRODUCTO

  ===================================================== */

  eliminarProducto(

    producto: ProductoVenta

  ): void {

    this.detalle.update(

      actual =>

        actual.filter(

          item =>

            item.id !==

            producto.id

        )

    );

    this.filtrarAccesorios(

      this.productoTexto.value

        .trim()

        .toLowerCase()

    );

  }

  /* =====================================================

     GENERAR

  ===================================================== */

  generar(): void {

    const error =

      this.validar();

    if (error) {

      this.notify.warning(

        error

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

        if (!confirmado) {

          return;

        }

        this.guardarNota();

      });

  }

  /* =====================================================

     GUARDAR NOTA

  ===================================================== */

  private guardarNota(): void {

    this.guardando.set(true);

    this.service

      .crear({

        idCliente:

          this.idCliente(),

        detalle:

          this.detalle()

            .map(

              producto => ({

                idProducto:

                  producto.id,

                cantidad:

                  Number(

                    producto.cantidad

                  ),

                precioUnitario:

                  Number(

                    producto.precioUnitario

                  )

              })

            )

      })

      .pipe(

        finalize(

          () =>

            this.guardando.set(false)

        )

      )

      .subscribe({

        next: response => {

          /*

            Aquí sí existe response porque

            el backend ya respondió.

          */

          const idNotaVenta =

            response.data.idNotaVenta;

          const numero =

            response.data.numeroNV ??

            idNotaVenta;

          this.notify.success(

            `${response.message ?? 'Nota de venta generada correctamente'} - N.º ${numero}`

          );

          /*

            Limpiamos el formulario.

          */

          this.limpiar();

          /*

            Refrescamos el stock luego

            de descontar los accesorios vendidos.

          */

          this.cargarStock();

          /*

            Abrimos automáticamente

            el comprobante generado.

          */

          this.visualizarNota(

            idNotaVenta

          );

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible generar la nota de venta'

          );

        }

      });

  }

  private visualizarNota(

    idNotaVenta: number

  ): void {

    this.dialog.open(

      AccesorioNotaDetalle,

      {

        width:

          '520px',

        maxWidth:

          '95vw',

        maxHeight:

          '95vh',

        disableClose:

          true,

        autoFocus:

          false,

        data: {

          idNotaVenta

        }

      }

    );

  }

  /* =====================================================

     VALIDAR

  ===================================================== */

  private validar():

    string | null {

    if (

      this.idCliente() <= 0

    ) {

      return (

        'Seleccione un cliente'

      );

    }

    if (

      this.detalle().length === 0

    ) {

      return (

        'Agregue por lo menos un accesorio'

      );

    }

    for (

      const producto of

      this.detalle()

    ) {

      const cantidad =

        Number(

          producto.cantidad

        );

      if (

        !Number.isInteger(

          cantidad

        ) ||

        cantidad <= 0

      ) {

        return (

          `Ingrese una cantidad válida para ${producto.accesorio}`

        );

      }

      if (

        cantidad >

        Number(

          producto.cantidadStock

        )

      ) {

        return (

          `La cantidad de ${producto.accesorio} supera el stock disponible`

        );

      }

      const precio =

        Number(

          producto.precioUnitario

        );

      if (

        !Number.isFinite(

          precio

        ) ||

        precio <= 0

      ) {

        return (

          `Ingrese un precio válido para ${producto.accesorio}`

        );

      }

      if (

        precio <

        Number(

          producto.precioCosto

        )

      ) {

        return (

          `El precio de ${producto.accesorio} no puede ser menor al costo`

        );

      }

      const pvp1 = Number(producto.pvp1);
      if (!Number.isFinite(pvp1)) {
        return `El accesorio ${producto.accesorio} no tiene PVP 1 (Locales) válido`;
      }
      if (precio < pvp1) {
        return `El precio de ${producto.accesorio} no puede ser menor al PVP 1 (Locales): ${this.formatearTotal(pvp1)}`;
      }


    }

    return null;

  }

  /* =====================================================

     LIMPIAR

  ===================================================== */

  private limpiar(): void {

    this.idCliente.set(

      0

    );

    this.clienteSeleccionado

      .set(

        null

      );

    this.detalle.set(

      []

    );

    this.busquedaCliente.set(

      ''

    );

    this.clienteTexto

      .setValue(

        '',

        {

          emitEvent: false

        }

      );

    this.productoTexto

      .setValue(

        '',

        {

          emitEvent: false

        }

      );

    this.clientesFiltrados

      .set(

        this.clientes()

      );

    this.filtrarAccesorios(

      ''

    );

  }

  /* =====================================================

     FORMATO TOTAL

  ===================================================== */

  private formatearTotal(

    valor: number

  ): string {

    return new Intl.NumberFormat(

      'en-US',

      {

        style:

          'currency',

        currency:

          'USD'

      }

    )

      .format(

        valor

      );

  }

}