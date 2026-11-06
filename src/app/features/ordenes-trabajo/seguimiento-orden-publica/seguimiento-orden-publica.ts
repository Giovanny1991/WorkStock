import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  HostListener,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  OrdenesTrabajoService
} from '../ordenes-trabajo.service';

interface SeguimientoHistorialPublico {
  id?: number;
  estado?: string | null;
  estadoNuevo?: string | null;
  observacion?: string | null;
  observaciones?: string | null;
  fechaRegistro?: string | null;
  usuario?: string | null;
}

interface SeguimientoImagenPublica {
  id: number;
  nombreOriginal?: string | null;
  fechaRegistro?: string | null;
  url?: string | null;
}

interface SeguimientoHistorialVista {
  id?: number;
  estado: string;
  observacion: string;
  fechaRegistro: string | null;
  usuario: string;
}

interface SeguimientoOrdenVista {
  empresa?: string | null;
  numeroOrden: string;
  modeloDispositivo?: string | null;
  tipoDispositivo?: string | null;
  marcaDispositivo?: string | null;
  imei?: string | null;
  imei1?: string | null;
  imei2?: string | null;
  numeroSerie?: string | null;
  serial?: string | null;
  color?: string | null;
  novedadReportada?: string | null;
  fallaReportada?: string | null;
  falla?: string | null;
  accesorios?: string | null;
  estadoFisico?: string | null;
  observacionesIngreso?: string | null;
  nombreCliente?: string | null;
  identificacionCliente?: string | null;
  telefonoCliente?: string | null;
  correoCliente?: string | null;
  tecnicoRecepcion?: string | null;
  danoDispositivo?: string | null;
  encendido?: string | number | boolean | null;
  apagado?: string | number | boolean | null;
  tapa?: string | number | boolean | null;
  bateria?: string | number | boolean | null;
  banSIM?: string | number | boolean | null;
  elementosRecibidos?: string[];
  condicionesFisicas?: string[];
  fechaIngreso?: string | null;
  estado?: string | null;
  logoEmpresaUrl?: string | null;
  totalPendiente?: boolean;
  total?: number | null;
  abono?: number | null;
  saldo?: number | null;
  observaciones?: string | null;
  historial?: SeguimientoHistorialPublico[];
  imagenes?: SeguimientoImagenPublica[];
}

@Component({
  selector: 'app-seguimiento-orden-publica',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './seguimiento-orden-publica.html',
  styleUrl: './seguimiento-orden-publica.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeguimientoOrdenPublicaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly service = inject(OrdenesTrabajoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly error = signal('');
  readonly orden = signal<SeguimientoOrdenVista | null>(null);
  readonly ultimaConsulta = signal<Date | null>(null);
  readonly errorLogo = signal(false);
  private readonly logoBlobUrl = signal<string | null>(null);
  private readonly imagenBlobUrls = signal<Record<number, string>>({});
  private mediaVersion = 0;
  readonly imagenSeleccionada = signal<SeguimientoImagenPublica | null>(null);

  readonly estadoActual = computed(() =>
    this.normalizarEstado(this.orden()?.estado)
  );

  readonly historial = computed<SeguimientoHistorialVista[]>(() => {
    const registros = this.orden()?.historial ?? [];

    return registros
      .map(item => ({
        id: item.id,
        estado: this.normalizarEstado(item.estadoNuevo ?? item.estado),
        observacion: this.texto(item.observaciones ?? item.observacion),
        fechaRegistro: this.texto(item.fechaRegistro) || null,
        usuario: this.texto(item.usuario)
      }))
      .filter(item => item.estado !== 'SIN ESTADO' || item.observacion || item.fechaRegistro);
  });

  readonly imagenes = computed<SeguimientoImagenPublica[]>(() => {
    const registros = this.orden()?.imagenes ?? [];

    return [...registros]
      .filter(imagen => Number.isSafeInteger(Number(imagen.id)) && Number(imagen.id) > 0)
      .sort((a, b) => this.fechaTiempo(a.fechaRegistro) - this.fechaTiempo(b.fechaRegistro));
  });

  readonly observacionPrincipal = computed(() => {
    const historial = this.historial();

    for (let i = 0; i < historial.length; i++) {
      if (historial[i].observacion) {
        return {
          texto: historial[i].observacion,
          estado: historial[i].estado || this.estadoActual(),
          fecha: historial[i].fechaRegistro,
          usuario: historial[i].usuario
        };
      }
    }

    const observacionOrden = this.texto(this.orden()?.observaciones);

    return {
      texto: observacionOrden || 'Aún no se ha registrado una observación técnica.',
      estado: this.estadoActual(),
      fecha: null as string | null,
      usuario: ''
    };
  });

  readonly valorCobrar = computed<number | null>(() => {
    const orden = this.orden();
    if (!orden || orden.totalPendiente === true) return null;

    const saldo = this.numeroNullable(orden.saldo);
    if (saldo !== null) return Math.max(saldo, 0);

    const total = this.numeroNullable(orden.total);
    if (total === null) return null;
    const abono = this.numeroNullable(orden.abono) ?? 0;
    return Math.max(total - abono, 0);
  });

  readonly cliente = computed(() => {
    const o=this.orden();
    return o ? [
      {etiqueta:'Nombre del cliente',valor:this.texto(o.nombreCliente)},
      {etiqueta:'Identificación',valor:this.texto(o.identificacionCliente)},
      {etiqueta:'Teléfono',valor:this.texto(o.telefonoCliente)},
      {etiqueta:'Correo',valor:this.texto(o.correoCliente)}
    ].filter(x=>x.valor) : [];
  });

  readonly datosEquipo = computed(() => {
    const o=this.orden();
    if (!o) return [] as {etiqueta:string;valor:string}[];
    return [
      {etiqueta:'Tipo de dispositivo',valor:this.texto(o.tipoDispositivo)},
      {etiqueta:'Marca',valor:this.texto(o.marcaDispositivo)},
      {etiqueta:'Modelo',valor:this.texto(o.modeloDispositivo)},
      {etiqueta:'Color',valor:this.texto(o.color)},
      {etiqueta:'IMEI / Serie',valor:this.texto(o.imei1 ?? o.imei ?? o.numeroSerie ?? o.serial)},
      {etiqueta:'IMEI 2',valor:this.texto(o.imei2)},
      {etiqueta:'Número de serie',valor:this.texto(o.numeroSerie ?? o.serial)},
      {etiqueta:'Recibido por',valor:this.texto(o.tecnicoRecepcion)}
    ].filter(x=>x.valor);
  });

  // Los accesorios y condiciones se consultan del catálogo dinámico, no de los campos heredados.
  readonly fallaPrincipal = computed(() => {
    const o = this.orden();
    return this.texto(o?.danoDispositivo ?? o?.novedadReportada ?? o?.fallaReportada ?? o?.falla)
      || 'No se registró una falla reportada.';
  });

  readonly recepcion = computed(() => {
    const o=this.orden();
    if (!o) return [] as {etiqueta:string;valor:string}[];
    const estado = this.texto(o.encendido)==='1' || o.encendido===true ? 'Encendido' :
      this.texto(o.apagado)==='1' || o.apagado===true ? 'Apagado' : '';
    return [
      {etiqueta:'Estado al ingresar',valor:estado},
      {etiqueta:'Observaciones de ingreso',valor:this.texto(o.observacionesIngreso)}
    ].filter(x=>x.valor);
  });

  readonly elementos = computed(() => this.orden()?.elementosRecibidos ?? []);
  readonly condiciones = computed(() => this.orden()?.condicionesFisicas ?? []);

  readonly iconoEstado = computed(() => {
    switch (this.estadoActual()) {
      case 'EN DIAGNÓSTICO':
      case 'RECEPCIÓN Y DIAGNÓSTICO': return 'troubleshoot';
      case 'PRESUPUESTO Y AUTORIZACIÓN': return 'request_quote';
      case 'ESPERANDO REPUESTO': return 'hourglass_top';
      case 'REPARADO': return 'build_circle';
      case 'SIN REPARACIÓN': return 'report_problem';
      case 'ENTREGADO': return 'task_alt';
      case 'ENTREGADO SIN REPARAR': return 'assignment_return';
      case 'EQUIPO ABANDONADO': return 'inventory_2';
      default: return 'assignment';
    }
  });

  readonly descripcionEstado = computed(() => {
    switch (this.estadoActual()) {
      case 'EN DIAGNÓSTICO':
      case 'RECEPCIÓN Y DIAGNÓSTICO':
        return 'Tu equipo fue recibido y se encuentra en diagnóstico.';
      case 'PRESUPUESTO Y AUTORIZACIÓN':
        return 'Estamos preparando o esperando tu autorización del presupuesto de reparación.';
      case 'ESPERANDO REPUESTO':
        return 'Estamos esperando un repuesto para continuar con el servicio.';
      case 'REPARADO':
        return 'La reparación de tu equipo ha sido completada.';
      case 'SIN REPARACIÓN':
        return 'El equipo fue diagnosticado, pero no fue posible completar la reparación.';
      case 'ENTREGADO':
        return 'El equipo fue entregado al cliente.';
      case 'ENTREGADO SIN REPARAR':
        return 'El equipo fue entregado sin reparación.';
      case 'EQUIPO ABANDONADO':
        return 'La orden fue cerrada por equipo abandonado.';
      default:
        return 'Consulta el estado actualizado de tu orden.';
    }
  });

  // Igual que el login: URL local creada a partir de un Blob.
  readonly logoUrl = computed(() => this.logoBlobUrl());

  ngOnDestroy(): void {
    this.mediaVersion++;
    this.limpiarMedios();
  }

  private limpiarMedios(): void {
    const logo = this.logoBlobUrl();
    this.logoBlobUrl.set(null);
    if (logo) URL.revokeObjectURL(logo);
    const anteriores = this.imagenBlobUrls();
    this.imagenBlobUrls.set({});
    Object.values(anteriores).forEach(url => URL.revokeObjectURL(url));
  }

  private cargarMedios(token: string): void {
    this.mediaVersion++;
    const version = this.mediaVersion;
    this.limpiarMedios();
    this.errorLogo.set(false);
    const base = `/api/ordenes-trabajo/seguimiento-publico/${token}`;
    // HttpClient pasa por los interceptores de Angular, como en login.
    this.http.get(`${base}/logo`, { responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          if (version !== this.mediaVersion) return;
          if (!blob.size || !blob.type.startsWith('image/')) {
            this.errorLogo.set(true);
            return;
          }
          this.logoBlobUrl.set(URL.createObjectURL(blob));
        },
        error: err => {
          if (version !== this.mediaVersion) return;
          console.warn('No se pudo cargar el logo del seguimiento:', err.status);
          this.errorLogo.set(true);
        }
      });

    for (const imagen of this.imagenes()) {
      const id = Number(imagen.id);
      if (!Number.isSafeInteger(id) || id <= 0) continue;
      this.http.get(`${base}/imagenes/${id}/archivo`, { responseType: 'blob' })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: blob => {
            if (version !== this.mediaVersion) return;
            if (!blob.size || !blob.type.startsWith('image/')) {
              console.warn('Archivo no es una imagen válida:', id);
              return;
            }
            this.imagenBlobUrls.update(actual => ({ ...actual, [id]: URL.createObjectURL(blob) }));
          },
          error: err => {
            if (version === this.mediaVersion) console.warn('Error al cargar fotografía:', id, err.status);
          }
        });
    }
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.consultar(params.get('token') ?? '');
      });
  }

  actualizar(): void {
    this.consultar(
      this.route.snapshot.paramMap.get('token') ?? ''
    );
  }

  falloLogo(): void {
    this.errorLogo.set(true);
  }

  abrirImagen(imagen: SeguimientoImagenPublica): void {
    if (!this.imagenUrl(imagen)) return;
    this.imagenSeleccionada.set(imagen);
  }

  cerrarImagen(): void {
    this.imagenSeleccionada.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarImagen();
  }

  imagenUrl(imagen: SeguimientoImagenPublica): string | null {
    return this.imagenBlobUrls()[Number(imagen.id)] ?? null;
  }

  numeroSeguro(valor: unknown): number {
    return this.numeroNullable(valor) ?? 0;
  }

  private consultar(token: string): void {
    if (this.cargando()) return;

    this.error.set('');
    this.cerrarImagen();

    if (!/^[a-f0-9]{64}$/.test(token)) {
      this.mediaVersion++;
      this.limpiarMedios();
      this.orden.set(null);
      this.error.set('El enlace de seguimiento no es válido.');
      return;
    }

    this.cargando.set(true);

    this.service
      .consultarSeguimientoPublico(token)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {
          if (!respuesta.success || !respuesta.data) {
            this.orden.set(null);
            this.error.set('No fue posible consultar la orden.');
            return;
          }

          this.orden.set(
            respuesta.data as SeguimientoOrdenVista
          );
          this.ultimaConsulta.set(new Date());
          this.cargarMedios(token);
        },
        error: (err: HttpErrorResponse) => {
          this.mediaVersion++;
          this.limpiarMedios();
          this.orden.set(null);

          this.error.set(
            err.status === 404 || err.status === 403
              ? 'El seguimiento ya no está disponible. La orden puede estar cerrada o entregada.'
              : 'No fue posible consultar la orden. Intenta nuevamente.'
          );
        }
      });
  }

  private normalizarEstado(valor: unknown): string {
    const estado = this.texto(valor).toUpperCase();
    return estado || 'SIN ESTADO';
  }

  private texto(valor: unknown): string {
    return String(valor ?? '').trim();
  }

  private numeroNullable(valor: unknown): number | null {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  private fechaTiempo(valor: string | null | undefined): number {
    if (!valor) return 0;

    const tiempo = new Date(valor).getTime();
    return Number.isFinite(tiempo) ? tiempo : 0;
  }
}
