import {

  Component,

  computed,

  inject,

  signal

} from '@angular/core';

import {

  MAT_DIALOG_DATA,

  MatDialogModule,

  MatDialogRef

} from '@angular/material/dialog';

import {

  FormControl,

  ReactiveFormsModule

} from '@angular/forms';

import {

  finalize

} from 'rxjs';

import {

  MatButtonModule

} from '@angular/material/button';

import {

  MatCheckboxModule

} from '@angular/material/checkbox';

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

  MatSelectModule

} from '@angular/material/select';

import { MatAutocompleteModule } from '@angular/material/autocomplete';

import {

  AccesorioStock,

  CategoriaAccesorio,

  MarcaAccesorio

} from '../accesorio-stock.model';

import {

  AccesoriosStockService

} from '../accesorios-stock.service';

import {

  NotificationService

} from '../../../core/services/notification';

export interface AccesorioStockDialogData {

  accesorio?: AccesorioStock;

  categorias: CategoriaAccesorio[];

  marcas: MarcaAccesorio[];

}

@Component({

  selector:

    'app-accesorio-stock-dialog',

  standalone: true,

  imports: [

    ReactiveFormsModule,

    MatButtonModule,

    MatCheckboxModule,

    MatDialogModule,

    MatFormFieldModule,

    MatIconModule,

    MatInputModule,

    MatProgressBarModule,

    MatSelectModule,

    MatAutocompleteModule

  ],

  templateUrl:

    './accesorio-stock-dialog.html',

  styleUrl:

    './accesorio-stock-dialog.scss'

})

export class AccesorioStockDialog {

  private readonly service =

    inject(AccesoriosStockService);

  private readonly notify =

    inject(NotificationService);

  private readonly dialogRef =

    inject(

      MatDialogRef<

        AccesorioStockDialog

      >

    );

  readonly data =

    inject<AccesorioStockDialogData>(

      MAT_DIALOG_DATA

    );

  readonly guardando =

    signal(false);

  readonly editando =

    computed(() =>

      !!this.data.accesorio

    );

  readonly categorias =

    this.data.categorias;

  readonly marcas =

    this.data.marcas;

  readonly idCategoria =

    new FormControl(

      this.data.accesorio

        ?.idCategoria ?? 0,

      {

        nonNullable: true

      }

    );

  readonly idMarca =

    new FormControl(

      this.data.accesorio

        ?.idMarca ?? 0,

      {

        nonNullable: true

      }

    );

  // Búsquedas visibles. Los IDs originales se mantienen para el backend.
  readonly busquedaCategoria = new FormControl<string>(
    this.data.categorias.find(
      x => x.id === this.idCategoria.value
    )?.categoria ?? '',
    { nonNullable: true }
  );

  readonly busquedaMarca = new FormControl<string>(
    this.data.marcas.find(
      x => x.id === this.idMarca.value
    )?.nombreMarca ?? '',
    { nonNullable: true }
  );

  private readonly textoCategoria = signal('');
  private readonly textoMarca = signal('');

  private normalizar(texto: string): string {
    return texto.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .trim();
  }

  readonly categoriasFiltradas = computed(() => {
    const buscar = this.normalizar(this.textoCategoria());
    return this.categorias.filter(
      x => this.normalizar(x.categoria).includes(buscar)
    );
  });

  readonly marcasFiltradas = computed(() => {
    const buscar = this.normalizar(this.textoMarca());
    return this.marcas.filter(
      x => this.normalizar(x.nombreMarca).includes(buscar)
    );
  });

  seleccionarCategoria(id: number): void {
    const item = this.categorias.find(x => x.id === id);
    if (!item) return;
    this.idCategoria.setValue(item.id);
    this.busquedaCategoria.setValue(item.categoria, { emitEvent: false });
    this.textoCategoria.set('');
  }

  seleccionarMarca(id: number): void {
    const item = this.marcas.find(x => x.id === id);
    if (!item) return;
    this.idMarca.setValue(item.id);
    this.busquedaMarca.setValue(item.nombreMarca, { emitEvent: false });
    this.textoMarca.set('');
  }

  readonly descripcion =

    new FormControl(

      this.data.accesorio

        ?.descripcion ?? '',

      {

        nonNullable: true

      }

    );

  readonly calidad =

    new FormControl(

      this.data.accesorio

        ?.calidad ?? '',

      {

        nonNullable: true

      }

    );

  readonly cantidad =

    new FormControl(

      0,

      {

        nonNullable: true

      }

    );

  readonly precioUnitario =

    new FormControl(

      0,

      {

        nonNullable: true

      }

    );

  readonly precioTotal =

    new FormControl(

      0,

      {

        nonNullable: true

      }

    );

  readonly pvp1 =

    new FormControl(

      Number(

        this.data.accesorio

          ?.pvp1 ?? 0

      ),

      {

        nonNullable: true

      }

    );

  readonly pvp2 =

    new FormControl(

      Number(

        this.data.accesorio

          ?.pvp2 ?? 0

      ),

      {

        nonNullable: true

      }

    );

  readonly recordatorio =

    new FormControl(

      false,

      {

        nonNullable: true

      }

    );

  constructor() {
    // Al escribir, se invalida el ID anterior hasta seleccionar una opción.
    this.busquedaCategoria.valueChanges.subscribe(texto => {
      this.textoCategoria.set(String(texto ?? ''));
      this.idCategoria.setValue(0);
    });

    this.busquedaMarca.valueChanges.subscribe(texto => {
      this.textoMarca.set(String(texto ?? ''));
      this.idMarca.setValue(0);
    });


    this.precioTotal

      .valueChanges

      .subscribe(() =>

        this.calcularPrecioUnitario()

      );

    this.cantidad

      .valueChanges

      .subscribe(() =>

        this.calcularPrecioUnitario()

      );

    this.recordatorio

      .valueChanges

      .subscribe(recordatorio => {

        if (recordatorio) {

          this.cantidad.setValue(

            0,

            {

              emitEvent: false

            }

          );

          this.precioUnitario

            .setValue(

              0,

              {

                emitEvent: false

              }

            );

          this.precioTotal

            .setValue(

              0,

              {

                emitEvent: false

              }

            );

          this.pvp1.setValue(

            0,

            {

              emitEvent: false

            }

          );

          this.pvp2.setValue(

            0,

            {

              emitEvent: false

            }

          );

        }

      });

  }

  readonly precioInicial =

    computed(() => {

      const cantidad =

        Number(

          this.cantidad.value || 0

        );

      const total =

        Number(

          this.precioTotal.value || 0

        );

      if (

        cantidad <= 0 ||

        total <= 0

      ) {

        return 0;

      }

      return (

        total /

        cantidad

      );

    });

  guardar(): void {

    const error =

      this.validar();

    if (error) {

      this.notify.warning(

        error

      );

      return;

    }

    if (this.editando()) {

      this.actualizar();

      return;

    }

    this.crear();

  }

  private crear(): void {

    this.guardando.set(true);

    this.service

      .crear({

        idCategoria:

          Number(

            this.idCategoria.value

          ),

        idMarca:

          Number(

            this.idMarca.value

          ),

        descripcion:

          this.descripcion.value

            .trim()

            .toUpperCase(),

        calidad:

          this.calidad.value

            .trim()

            .toUpperCase(),

        cantidad:

          this.recordatorio.value

            ? 0

            : Number(

              this.cantidad.value

            ),

        precioUnitario:

          this.recordatorio.value

            ? 0

            : Number(

              this.precioUnitario.value

            ),

        precioTotal:

          this.recordatorio.value

            ? 0

            : Number(

              this.precioTotal.value

            ),

        pvp1:

          this.recordatorio.value

            ? 0

            : Number(

              this.pvp1.value

            ),

        pvp2:

          this.recordatorio.value

            ? 0

            : Number(

              this.pvp2.value

            ),

        recordatorio:

          this.recordatorio.value

      })

      .pipe(

        finalize(() =>

          this.guardando.set(false)

        )

      )

      .subscribe({

        next: response => {

          this.notify.success(

            response.message

          );

          this.dialogRef.close(

            true

          );

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible registrar el accesorio'

          );

        }

      });

  }

  private actualizar(): void {

    const accesorio =

      this.data.accesorio;

    if (!accesorio) {

      return;

    }

    this.guardando.set(true);

    this.service

      .actualizar(

        accesorio.id,

        {

          idCategoria:

            Number(

              this.idCategoria.value

            ),

          idMarca:

            Number(

              this.idMarca.value

            ),

          descripcion:

            this.descripcion.value

              .trim()

              .toUpperCase(),

          calidad:

            this.calidad.value

              .trim()

              .toUpperCase(),

          pvp1:

            Number(

              this.pvp1.value

            ),

          pvp2:

            Number(

              this.pvp2.value

            )

        }

      )

      .pipe(

        finalize(() =>

          this.guardando.set(false)

        )

      )

      .subscribe({

        next: response => {

          this.notify.success(

            response.message

          );

          this.dialogRef.close(

            true

          );

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible actualizar el accesorio'

          );

        }

      });

  }

  private validar():

    string | null {

    if (

      Number(

        this.idCategoria.value

      ) <= 0

    ) {

      return 'Seleccione una categoría';

    }

    if (

      Number(

        this.idMarca.value

      ) <= 0

    ) {

      return 'Seleccione una marca';

    }

    if (

      this.descripcion.value

        .trim()

        .length < 2

    ) {

      return 'Ingrese la descripción del accesorio';

    }

    if (

      this.calidad.value

        .trim()

        .length < 2

    ) {

      return 'Ingrese la calidad del accesorio';

    }

    if (this.editando()) {

      if (

        Number(

          this.pvp1.value

        ) <= 0

      ) {

        return 'Ingrese el precio local';

      }

      if (

        Number(

          this.pvp2.value

        ) <= 0

      ) {

        return 'Ingrese el precio público';

      }

      if (

        Number(

          this.pvp1.value

        ) >

        Number(

          this.pvp2.value

        )

      ) {

        return 'El precio local no puede ser mayor que el precio público';

      }

      return null;

    }

    if (

      this.recordatorio.value

    ) {

      return null;

    }

    if (

      Number(

        this.cantidad.value

      ) <= 0

    ) {

      return 'Ingrese una cantidad válida';

    }

    if (

      Number(

        this.precioTotal.value

      ) <= 0

    ) {

      return 'Ingrese el precio total';

    }

    if (

      Number(

        this.pvp1.value

      ) <= 0

    ) {

      return 'Ingrese el precio local';

    }

    if (

      Number(

        this.pvp2.value

      ) <= 0

    ) {

      return 'Ingrese el precio público';

    }

    if (

      Number(

        this.pvp1.value

      ) >

      Number(

        this.pvp2.value

      )

    ) {

      return 'El precio local no puede ser mayor que el precio público';

    }

    if (

      Number(

        this.pvp1.value

      ) <

      Number(

        this.precioUnitario.value

      )

    ) {

      return 'El precio local no puede ser menor que el precio unitario';

    }

    return null;

  }

  private calcularPrecioUnitario():

    void {

    if (

      this.editando() ||

      this.recordatorio.value

    ) {

      return;

    }

    const cantidad =

      Number(

        this.cantidad.value || 0

      );

    const precioTotal =

      Number(

        this.precioTotal.value || 0

      );

    const resultado =

      cantidad > 0 &&

        precioTotal > 0

        ? precioTotal /

        cantidad

        : 0;

    this.precioUnitario

      .setValue(

        Number(

          resultado.toFixed(3)

        ),

        {

          emitEvent: false

        }

      );

  }

  cerrar(): void {

    if (

      this.guardando()

    ) {

      return;

    }

    this.dialogRef.close();

  }

}