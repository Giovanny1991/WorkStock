
import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  NavigationEnd,
  RouterLink
} from '@angular/router';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  filter
} from 'rxjs';


interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule
  ],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss'
})
export class Breadcrumbs {

  private readonly router = inject(Router);

  readonly items = signal<BreadcrumbItem[]>([]);

  private readonly rutas: Record<
    string,
    BreadcrumbItem[]
  > = {

      '/inicio': [
        { label: 'Inicio' }
      ],

      '/facturas/nueva': [
        { label: 'Ventas celulares' },
        { label: 'Facturación' },
        { label: 'Generar factura' }
      ],

      '/facturas/historial': [
        { label: 'Ventas celulares' },
        { label: 'Facturación' },
        { label: 'Historial de facturas' }
      ],

      '/notas-venta/nueva': [
        { label: 'Ventas celulares' },
        { label: 'Notas de venta' },
        { label: 'Nueva nota de venta' }
      ],

      '/notas-venta/historial': [
        { label: 'Ventas celulares' },
        { label: 'Notas de venta' },
        { label: 'Historial de notas' }
      ],

      '/accesorios/notas-venta/nueva': [
        { label: 'Ventas accesorios' },
        { label: 'Notas de venta' },
        { label: 'Nueva nota de venta' }
      ],

      '/accesorios/notas-venta/historial': [
        { label: 'Ventas accesorios' },
        { label: 'Notas de venta' },
        { label: 'Historial de notas' }
      ],

      '/servicio-tecnico/nueva': [
        { label: 'Operaciones' },
        { label: 'Servicio técnico' },
        { label: 'Nueva orden' }
      ],

      '/servicio-tecnico/pendientes': [
        { label: 'Operaciones' },
        { label: 'Servicio técnico' },
        { label: 'Órdenes pendientes' }
      ],

      '/servicio-tecnico/historial': [
        { label: 'Operaciones' },
        { label: 'Servicio técnico' },
        { label: 'Órdenes finalizadas' }
      ],

      '/clientes': [
        { label: 'Gestión' },
        { label: 'Clientes' }
      ],

      '/proveedores': [
        { label: 'Gestión' },
        { label: 'Proveedores' }
      ],

      '/marcas': [
        { label: 'Inventario' },
        { label: 'Marcas de productos' }
      ],

      '/inventario/celulares': [
        { label: 'Inventario' },
        { label: 'Celulares' },
        { label: 'Stock de celulares' }
      ],

      '/modelos': [
        { label: 'Inventario' },
        { label: 'Celulares' },
        { label: 'Modelos de dispositivos' }
      ],

      '/accesorios/accesorios-stock': [
        { label: 'Inventario' },
        { label: 'Accesorios' },
        { label: 'Stock de accesorios' }
      ],

      '/accesorios/categorias': [
        { label: 'Inventario' },
        { label: 'Accesorios' },
        { label: 'Categorías de accesorios' }
      ],

      '/configuracion/iva': [
        { label: 'Administración' },
        { label: 'Configuración' },
        { label: 'Actualización del IVA' }
      ]

    };


  constructor() {

    this.actualizar(this.router.url);

    this.router.events.pipe(
      filter(
        event => event instanceof NavigationEnd
      )
    ).subscribe(event => {

      this.actualizar(
        event.urlAfterRedirects
      );

    });

  }


  private actualizar(url: string): void {

    const ruta = url
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '') || '/inicio';

    const elementos = this.rutas[ruta];

    this.items.set(
      elementos ?? []
    );

  }

}
