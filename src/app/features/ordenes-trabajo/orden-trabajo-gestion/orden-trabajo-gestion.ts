import {
  Component, DestroyRef, OnInit, ViewChild,
  computed, inject, signal
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogosOrdenService, CatalogoOrden, TipoDispositivoOrden, ElementoRecibidoOrden, CondicionFisicaOrden } from '../catalogos-orden/catalogos-orden.service';
import { CatalogosOrdenDialog } from '../catalogos-orden/catalogos-orden-dialog';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  catchError, debounceTime, distinctUntilChanged,
  finalize, firstValueFrom, forkJoin, map, of, switchMap, tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef
} from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AccesorioDisponibleOrden, AccesorioUsadoOrden,
  EstadoOrdenTrabajo, ESTADOS_ORDEN_TRABAJO,
  OrdenTrabajoResumen, OrdenTrabajoEstadoHistorial,
  OrdenTrabajoEstadoHistorialResponse, SeguridadDispositivo,
  esOrdenCerrada
} from '../orden-trabajo.model';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { AccesoriosStockService } from '../../accesorios-stock/accesorios-stock.service';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { ClienteDialog } from '../../clientes/cliente-dialog/cliente-dialog';
import { Cliente } from '../../clientes/cliente.model';
import { OrdenTrabajoImagenesComponent } from '../orden-trabajo-imagenes/orden-trabajo-imagenes';
import { OrdenTrabajoSeguridadComponent } from '../orden-trabajo-seguridad/orden-trabajo-seguridad';
import { OrdenTrabajoQrDialog } from '../orden-trabajo-qr/orden-trabajo-qr-dialog';
import { interval, takeUntil } from 'rxjs';
import { PagosEditorComponent } from '../../../shared/pagos-editor/pagos-editor';
import type { PagoCaptura, PagoRegistrado } from '../../../shared/pagos-editor/pagos-editor.model';

interface OrdenTrabajoGestionData {
  idOrden: number;
  soloLectura?: boolean;
}

@Component({
  selector: 'app-orden-trabajo-gestion',
  standalone: true,
  imports: [
    PagosEditorComponent,
    OrdenTrabajoImagenesComponent,
    OrdenTrabajoSeguridadComponent,
    CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatAutocompleteModule, MatButtonModule,
    MatCheckboxModule, MatDialogModule,
    MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressBarModule, MatSelectModule, MatRadioModule,
    MatTableModule, MatTooltipModule
  ],
  templateUrl: './orden-trabajo-gestion.html',
  styleUrl: './orden-trabajo-gestion.scss'
})
export class OrdenTrabajoGestion implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(OrdenesTrabajoService);
  private readonly catalogos = inject(CatalogosOrdenService);
  private readonly authService = inject(AuthService);
  private readonly stockService = inject(AccesoriosStockService);
  private readonly http = inject(HttpClient);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly ref = inject(MatDialogRef<OrdenTrabajoGestion>);
  readonly data = inject<OrdenTrabajoGestionData>(MAT_DIALOG_DATA);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly procesandoAccesorio = signal(false);
  readonly orden = signal<OrdenTrabajoResumen | null>(null);
  readonly esAdministrador = computed(() => this.authService.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR');
  readonly tiposDispositivo = signal<TipoDispositivoOrden[]>([]);
  readonly elementosCatalogo = signal<ElementoRecibidoOrden[]>([]);
  readonly elementosSeleccionados = signal<number[]>([]);
  readonly condicionesCatalogo = signal<CondicionFisicaOrden[]>([]);
  readonly condicionesSeleccionadas = signal<number[]>([]);
  readonly cargandoCatalogos = signal(false);
  readonly idTipoDispositivo = new FormControl<number | null>(null, { validators: [Validators.required] });
  cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    forkJoin({ tipos: this.catalogos.listarTipos(false), elementos: this.catalogos.listarElementos(false), condiciones: this.catalogos.listarCondiciones(false) })
      .pipe(finalize(() => this.cargandoCatalogos.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: r => { this.tiposDispositivo.set(r.tipos.data); this.elementosCatalogo.set(r.elementos.data); this.condicionesCatalogo.set(r.condiciones.data); },
        error: e => this.notify.error(e?.error?.message ?? 'No se pudieron cargar los catálogos de la orden')
      });
  }
  gestionarCatalogo(tipo: CatalogoOrden): void {
    if (!this.esAdministrador() || this.soloLectura() || this.guardando()) return;
    this.dialog.open(CatalogosOrdenDialog, { width: '620px', maxWidth: '95vw', autoFocus: false, data: tipo })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(cambio => { if (cambio) this.cargarCatalogos(); });
  }
  seleccionarElemento(id: number, seleccionado: boolean): void {
    this.elementosSeleccionados.update(actual => seleccionado ? [...new Set([...actual, id])] : actual.filter(x => x !== id));
  }
  elementoSeleccionado(id: number): boolean { return this.elementosSeleccionados().includes(id); }
  seleccionarCondicion(id: number, seleccionado: boolean): void {
    this.condicionesSeleccionadas.update(actual => seleccionado ? [...new Set([...actual, id])] : actual.filter(x => x !== id));
  }
  condicionSeleccionada(id: number): boolean { return this.condicionesSeleccionadas().includes(id); }
  condicionDisponible(item: CondicionFisicaOrden): boolean { return item.estado === 'ACTIVO' || this.condicionSeleccionada(item.id); }
  tipoDisponible(tipo: TipoDispositivoOrden): boolean { return tipo.estado === 'ACTIVO' || tipo.id === this.idTipoDispositivo.value; }
  elementoDisponible(item: ElementoRecibidoOrden): boolean { return item.estado === 'ACTIVO' || this.elementoSeleccionado(item.id); }

  readonly accesoriosDisponibles = signal<AccesorioDisponibleOrden[]>([]);
  readonly accesoriosUsados = signal<AccesorioUsadoOrden[]>([]);
  readonly historialEstados = signal<OrdenTrabajoEstadoHistorial[]>([]);
  readonly cargandoHistorial = signal(false);
  readonly buscandoAccesorios = signal(false);
  readonly errorBusquedaAccesorios = signal(false);
  readonly textoBusquedaAccesorio = signal('');
  private versionBusquedaAccesorio = 0;

  readonly soloLectura = computed(() =>
    this.data.soloLectura === true ||
    esOrdenCerrada(this.orden()?.estado)
  );

  readonly estadosOrden = ESTADOS_ORDEN_TRABAJO;
  readonly displayedColumnsAccesorios = ['accesorio', 'cantidad', 'acciones'];
  readonly columnasAccesorios = computed(() =>
    this.soloLectura() ? ['accesorio', 'cantidad'] : this.displayedColumnsAccesorios
  );

  readonly modeloEdicion = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] });
  readonly imeiEdicion = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20)] });
  readonly danoEdicion = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] });
  readonly recepcionEdicion = new FormControl<'ENCENDIDO' | 'APAGADO' | 'SIN DEFINIR'>('SIN DEFINIR', { nonNullable: true });

  // Editar cliente a través del diálogo oficial del módulo Clientes.
  editarCliente(): void {
    const o = this.orden();
    const referencia = o as (OrdenTrabajoResumen & { idCliente?: number; direccion?: string }) | null;
    if (!referencia || this.soloLectura() || this.guardando() || !referencia.idCliente) return;
    const cliente: Cliente = {
      id: referencia.idCliente,
      identificacion: referencia.identificacion ?? '',
      nombreCliente: referencia.nombreCliente ?? '',
      telefono: referencia.telefono ?? '',
      direccion: referencia.direccion ?? '',
      correo: referencia.correo ?? '',
      estado: 'ACTIVO',
      fechaIngreso: ''
    };
    this.dialog.open(ClienteDialog, {
      width: '570px', maxWidth: '95vw', autoFocus: false,
      data: { cliente }
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(resultado => {
      if (resultado) this.recargarDatosCliente();
    });
  }

  private recargarDatosCliente(): void {
    this.service.obtener(this.data.idOrden)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          if (respuesta.data) this.orden.set({ ...this.orden()!, ...respuesta.data });
        },
        error: () => this.notify.warning('Cliente guardado; no se pudo refrescar la orden.')
      });
  }

  private recepcionBool(valor: unknown): boolean {
    return valor === true || valor === 1 || valor === '1' || String(valor).toLowerCase() === 'true';
  }

  private llenarRecepcion(o: OrdenTrabajoResumen): void {
    this.modeloEdicion.setValue(o.modeloDispositivo ?? '');
    this.imeiEdicion.setValue(o.imei ?? '');
    this.danoEdicion.setValue(o.danoDispositivo ?? '');
    this.recepcionEdicion.setValue(this.recepcionBool(o.encendido) ? 'ENCENDIDO' : this.recepcionBool(o.apagado) ? 'APAGADO' : 'SIN DEFINIR');
    this.idTipoDispositivo.setValue(o.idTipoDispositivo ?? null);
    this.elementosSeleccionados.set((o.elementosRecibidos ?? []).map(e => e.idElemento));
    this.condicionesSeleccionadas.set((o.condicionesFisicas ?? []).map(e => e.idCondicion));
  }

  private validarRecepcion(): string | null {
    const controles = [this.idTipoDispositivo, this.modeloEdicion, this.imeiEdicion, this.danoEdicion];
    controles.forEach(c => c.markAsTouched());
    if (controles.some(c => c.invalid)) return 'Revisa los datos del equipo recibido.';
    if (!this.idTipoDispositivo.value) return 'Selecciona el tipo de dispositivo.';
    if (this.modeloEdicion.value.trim().length < 3 || this.modeloEdicion.value.trim().length > 200)
      return 'El modelo debe contener entre 3 y 200 caracteres.';
    if (this.danoEdicion.value.trim().length < 3 || this.danoEdicion.value.trim().length > 1000)
      return 'El daño reportado debe contener entre 3 y 1000 caracteres.';
    if (this.recepcionEdicion.value === 'SIN DEFINIR')
      return 'Selecciona si el equipo se recibió encendido o apagado.';
    return null;
  }

  private datosRecepcion() {
    return {
      idTipoDispositivo: this.idTipoDispositivo.value!,
      elementosRecibidos: this.elementosSeleccionados(),
      condicionesFisicas: this.condicionesSeleccionadas(),
      modeloDispositivo: this.modeloEdicion.value.trim().toUpperCase(),
      imei: this.imeiEdicion.value.trim(),
      danoDispositivo: this.danoEdicion.value.trim().toUpperCase(),
      encendido: this.recepcionEdicion.value === 'ENCENDIDO',
      apagado: this.recepcionEdicion.value === 'APAGADO'
    };
  }

  readonly totalPendiente = new FormControl(false, { nonNullable: true });
  readonly total = new FormControl(0, { nonNullable: true });
  readonly abono = new FormControl(0, { nonNullable: true });
  readonly observaciones = new FormControl('', { nonNullable: true });
  readonly estado = new FormControl<EstadoOrdenTrabajo | ''>(
    '', { nonNullable: true }
  );
  readonly busquedaEstado = new FormControl('', { nonNullable: true });
  readonly estadosFiltrados = signal<readonly EstadoOrdenTrabajo[]>([
    ...ESTADOS_ORDEN_TRABAJO
  ]);
  readonly idAccesorio = new FormControl<number | null>(null);
  readonly busquedaAccesorio = new FormControl<string | AccesorioDisponibleOrden>(
    '', { nonNullable: true }
  );
  readonly cantidadAccesorio = new FormControl(1, { nonNullable: true });
  readonly accesoriosFiltrados = computed(() => this.accesoriosDisponibles());

  readonly mostrarAccesorio = (
    valor: string | AccesorioDisponibleOrden | null
  ): string => !valor ? '' : typeof valor === 'string' ? valor : valor.accesorio;

  readonly requiereObservaciones = computed(() =>
    ['REPARADO', 'SIN REPARACIÓN', 'ENTREGADO', 'ENTREGADO SIN REPARAR',
      'EQUIPO ABANDONADO', 'FINALIZADO'].includes(this.estado.value)
  );

  abrirQrFotos(): void {
    if (!this.data.idOrden || this.guardando()) return;
    const ventana = this.dialog.open(OrdenTrabajoQrDialog, {
      width: '440px', maxWidth: '95vw', autoFocus: false,
      data: { idOrden: this.data.idOrden, numeroOrden: this.orden()?.numeroOrden ?? this.data.idOrden }
    });
    interval(6000).pipe(takeUntil(ventana.afterClosed()), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.imagenesOrden?.cargando() && !this.imagenesOrden?.procesando()) void this.imagenesOrden?.cargar();
    });
    ventana.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.imagenesOrden && !this.imagenesOrden.procesando()) void this.imagenesOrden.cargar();
    });
  }
  @ViewChild('pagosGestion') pagosGestion?: PagosEditorComponent;
  readonly pagosNuevos = signal<PagoCaptura[]>([]);
  readonly pagosRegistrados = signal<PagoRegistrado[]>([]);
  readonly eliminandoPagoId = signal<number | null>(null);
  readonly abonoHistorico = signal(0);
  readonly consultandoPagos = signal(false);
  readonly falloConsultaPagos = signal(false);
  onPagosChange(pagos: PagoCaptura[]): void {this.pagosNuevos.set(pagos);}
  eliminarPagoRegistrado(idPago: number): void {
    if (!this.esAdministrador() || this.soloLectura() || this.guardando() || this.eliminandoPagoId() !== null || this.consultandoPagos() || this.falloConsultaPagos()) return;
    const pago = this.pagosRegistrados().find(x => x.id === idPago && x.estado === 'REGISTRADO');
    if (!pago) return;
    this.dialog.open(ConfirmDialog, {
      width: '460px', maxWidth: '92vw', disableClose: true,
      data: {
        title: 'Eliminar pago registrado',
        message: `¿Eliminar definitivamente ${pago.formaPago} por $${Number(pago.valor).toFixed(2)}? El importe se descontará del abono y aumentará el saldo. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar pago'
      }
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmado => {
      if (!confirmado || !this.esAdministrador() || this.soloLectura() || this.guardando() || this.eliminandoPagoId() !== null) return;
      this.eliminandoPagoId.set(idPago);
      this.service.eliminarPagoRegistrado(this.data.idOrden,idPago)
        .pipe(finalize(() => this.eliminandoPagoId.set(null)),takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: respuesta => {
            const abono = Number(respuesta.data?.abono);
            const saldo = Number(respuesta.data?.saldo);
            if (Number.isFinite(abono) && Number.isFinite(saldo)) {
              this.abono.setValue(abono,{emitEvent:false});
              this.orden.update(actual => actual ? {...actual,abono,saldo} : actual);
            }
            this.cargarPagos();
            this.notify.success(respuesta.message ?? 'Pago eliminado correctamente');
          },
          error: error => {
            if (!error?.status) {
              this.notify.warning('No fue posible confirmar la eliminación. Consulta nuevamente el historial antes de repetirla.');
              this.cargarPagos();
              return;
            }
            this.notify.error(error?.error?.message ?? 'No fue posible eliminar el pago');
          }
        });
    });
  }

  cargarPagos(): void {
    this.consultandoPagos.set(true); this.falloConsultaPagos.set(false);
    this.service.obtenerPagos(this.data.idOrden).pipe(
      finalize(()=>this.consultandoPagos.set(false)),takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next:r=>{
        const todos=r.data?.pagos??[];
        const activos=todos.filter(x=>x.estado==='REGISTRADO');
        this.pagosRegistrados.set(todos);
        const actuales=activos.reduce((s,x)=>s+Math.round(Number(x.valor)*100),0)/100;
        this.abonoHistorico.set(Math.max(0,Number((Number(r.data.abonoAnterior??0)-actuales).toFixed(2))));
      },
      error:()=>{this.falloConsultaPagos.set(true);this.notify.warning('No se pudo consultar el historial de pagos de la orden.');}
    });
  }

  @ViewChild('imagenesOrden')
  imagenesOrden?: OrdenTrabajoImagenesComponent;

  @ViewChild('seguridadGestion')
  seguridadGestion?: OrdenTrabajoSeguridadComponent;

  readonly seguridadInicial = signal<SeguridadDispositivo | null>(null);
  readonly seguridadConsultada = signal<SeguridadDispositivo | null>(null);
  readonly consultandoSeguridad = signal(false);

  ngOnInit(): void {
    this.busquedaEstado.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(texto => {
        const normalizar = (s: string) =>
          s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toUpperCase().trim();
        const termino = normalizar(texto);
        this.estadosFiltrados.set(
          this.estadosOrden.filter(e => normalizar(e).includes(termino))
        );
        const exacto = this.estadosOrden.find(e => normalizar(e) === termino);
        if (exacto && !this.soloLectura()) this.estado.setValue(exacto);
      });

    this.configurarBusquedaAccesorios();
    this.cargarCatalogos();
    this.cargar();

    this.totalPendiente.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(pendiente => {
        if (pendiente && !this.soloLectura()) {
          if (Number(this.orden()?.abono??0)>0 || this.pagosNuevos().length>0) {
            this.totalPendiente.setValue(false,{emitEvent:false});
            this.notify.warning('No puedes marcar valor por confirmar mientras existan pagos anteriores o nuevos pagos agregados.');
            return;
          }
          this.total.setValue(0, { emitEvent: false });
          this.abono.setValue(0, { emitEvent: false });
        }
      });
  }

  private configurarBusquedaAccesorios(): void {
    this.busquedaAccesorio.valueChanges
      .pipe(
        tap(valor => {
          if (this.soloLectura() || typeof valor !== 'string') return;
          this.versionBusquedaAccesorio++;
          const texto = valor.trim().replace(/\s+/g, ' ').slice(0, 100);
          this.idAccesorio.setValue(null, { emitEvent: false });
          this.textoBusquedaAccesorio.set(texto);
          this.accesoriosDisponibles.set([]);
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
          if (this.soloLectura() || texto.length < 2) {
            this.buscandoAccesorios.set(false);
            return of<AccesorioDisponibleOrden[]>([]);
          }
          this.buscandoAccesorios.set(true);
          return this.stockService.buscarParaAutocomplete(texto).pipe(
            map(response => {
              if (version !== this.versionBusquedaAccesorio) return [];
              return (response.data ?? [])
                .filter(a =>
                  Number(a.id) > 0 && Number(a.cantidadStock) > 0
                )
                .map(a => ({
                  id: Number(a.id),
                  idCategoria: Number(a.idCategoria),
                  idMarca: Number(a.idMarca),
                  descripcion: a.descripcion,
                  accesorio: [a.accesorio, a.calidad].filter(Boolean).join(' '),
                  calidad: a.calidad,
                  cantidadStock: Number(a.cantidadStock)
                } as AccesorioDisponibleOrden));
            }),
            catchError(error => {
              if (version === this.versionBusquedaAccesorio) {
                this.errorBusquedaAccesorios.set(true);
                this.notify.error(
                  error?.error?.message ??
                  'No fue posible buscar accesorios'
                );
              }
              return of<AccesorioDisponibleOrden[]>([]);
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
        if (this.idAccesorio.value === null) {
          this.accesoriosDisponibles.set(accesorios);
        }
      });
  }

  cargar(): void {
    this.cargando.set(true);
    this.orden.set(null);
    this.accesoriosUsados.set([]);
    this.seguridadInicial.set(null);
    this.seguridadConsultada.set(null);
    forkJoin({
      orden: this.service.obtener(this.data.idOrden),
      usados: this.service.listarAccesoriosOrden(this.data.idOrden).pipe(
        catchError(error => {
          this.notify.warning(
            error?.error?.message ??
            'No se pudieron consultar los accesorios. La orden se mostrará normalmente.'
          );
          return of({ success: true, data: [] as AccesorioUsadoOrden[] });
        })
      )
    }).pipe(
      finalize(() => this.cargando.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: resultado => {
        const orden = resultado.orden?.data;
        if (!orden) {
          this.notify.error('El servidor no devolvió los datos de la orden de trabajo');
          return;
        }
        this.orden.set(orden);
        this.accesoriosUsados.set(resultado.usados?.data ?? []);
        this.cargarFormulario(orden);
        this.cargarHistorial();
        this.cargarPagos();
      },
      error: error => {
        this.notify.error(
          error?.error?.message ??
          'No fue posible cargar la información principal de la orden de trabajo'
        );
      }
    });
  }

  private cargarFormulario(orden: OrdenTrabajoResumen): void {
    const pendiente = ['true', '1'].includes(
      String(orden.totalPendiente).toLowerCase()
    );
    this.llenarRecepcion(orden);
    this.totalPendiente.setValue(pendiente, { emitEvent: false });
    this.total.setValue(Number(orden.total ?? 0), { emitEvent: false });
    this.abono.setValue(Number(orden.abono ?? 0), { emitEvent: false });
    // Cada nueva gestión inicia sin observación ni estado seleccionado.
    // El estado actual de la orden continúa visible en el encabezado y en el historial.
    this.observaciones.setValue('', { emitEvent: false });
    this.estado.setValue('', { emitEvent: false });
    this.busquedaEstado.setValue('', { emitEvent: true });

    // SEGURIDAD: SOLO SE RECIBE EL TIPO, NO LA CREDENCIAL
    this.seguridadInicial.set({
      tipoBloqueo: orden.tipoBloqueo ?? 'NO_REGISTRADO',
      claveDispositivo: null,
      patronDispositivo: null
    });
    this.seguridadConsultada.set(null);

    if (
      orden.tipoBloqueo === 'PATRON' ||
      orden.tipoBloqueo === 'CONTRASENA'
    ) {
      this.cargarSeguridadAutomatica();
    }

    const controlesRecepcion = [this.modeloEdicion, this.imeiEdicion, this.danoEdicion, this.recepcionEdicion, this.idTipoDispositivo];
    for (const control of controlesRecepcion) { if (this.soloLectura()) control.disable({ emitEvent: false }); else control.enable({ emitEvent: false }); }
    const controles = [
      this.totalPendiente, this.total, this.abono,
      this.observaciones, this.estado, this.busquedaEstado
    ];
    for (const control of controles) {
      if (this.soloLectura()) control.disable({ emitEvent: false });
      else control.enable({ emitEvent: false });
    }
  }


  private cargarSeguridadAutomatica(): void {
    this.consultandoSeguridad.set(true);

    this.service.consultarSeguridad(this.data.idOrden)
      .pipe(
        finalize(() => this.consultandoSeguridad.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          if (response?.data) {
            this.seguridadConsultada.set(response.data);
          }
        },
        error: error => {
          this.seguridadConsultada.set(null);
          this.notify.warning(
            error?.status === 403
              ? 'No tienes permisos para visualizar el desbloqueo registrado.'
              : 'No fue posible cargar el desbloqueo del dispositivo.'
          );
        }
      });
  }

  cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.http.get<OrdenTrabajoEstadoHistorialResponse>(
      `/api/ordenes-trabajo/${this.data.idOrden}/historial-estados`
    )
      .pipe(
        finalize(() => this.cargandoHistorial.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => this.historialEstados.set(response.data ?? []),
        error: error => {
          this.historialEstados.set([]);
          this.notify.warning(
            error?.error?.message ??
            'No fue posible consultar el historial de estados'
          );
        }
      });
  }

  // Los pagos añadidos al editor son borradores hasta pulsar Actualizar.
  totalPagosNuevos(): number { return Math.round(this.pagosNuevos().reduce((s,p)=>s+Math.round(Number(p.valor)*100),0))/100; }
  abonoPrevisto(): number { return Math.round((Number(this.abono.value)+this.totalPagosNuevos())*100)/100; }
  saldoDisponibleParaPago(): number { return Math.max(0,Math.round((Number(this.total.value)-Number(this.abono.value))*100)/100); }
  saldo(): number {
    if (this.totalPendiente.value) return 0;
    return Math.max(0,Math.round((Number(this.total.value)-this.abonoPrevisto())*100)/100);
  }

  estadoRecepcion(): string {
    const o = this.orden();
    return !o ? '-' : o.encendido ? 'ENCENDIDO' :
      o.apagado ? 'APAGADO' : '-';
  }

  accesoriosRecepcion(): string {
    const o = this.orden();
    if (!o) return '-';
    const items: string[] = [];
    if (o.tapa) items.push('TAPA');
    if (o.bateria) items.push('BATERÍA');
    if (o.banSIM) items.push('BANDEJA SIM');
    return items.length ? items.join(' / ') : 'NINGUNO';
  }

  accesorioSeleccionado(): AccesorioDisponibleOrden | null {
    const id = Number(this.idAccesorio.value);
    return !id ? null :
      this.accesoriosDisponibles().find(a => a.id === id) ?? null;
  }

  puedeAgregarAccesorio(): boolean {
    if (this.soloLectura()) return false;
    const accesorio = this.accesorioSeleccionado();
    const cantidad = Number(this.cantidadAccesorio.value);
    return !!accesorio && Number.isSafeInteger(cantidad) &&
      cantidad > 0 && Number(accesorio.cantidadStock) >= cantidad;
  }

  seleccionarAccesorio(accesorio: AccesorioDisponibleOrden): void {
    if (this.soloLectura()) return;
    if (!accesorio || Number(accesorio.id) <= 0 ||
      Number(accesorio.cantidadStock) <= 0) {
      this.notify.warning('Seleccione un accesorio con stock disponible');
      return;
    }

    this.versionBusquedaAccesorio++;
    this.idAccesorio.setValue(accesorio.id, { emitEvent: false });
    this.busquedaAccesorio.setValue(accesorio, { emitEvent: false });
    this.textoBusquedaAccesorio.set('');
    this.accesoriosDisponibles.set([accesorio]);
    this.buscandoAccesorios.set(false);
    this.errorBusquedaAccesorios.set(false);
  }

  private limpiarBusquedaAccesorio(): void {
    this.versionBusquedaAccesorio++;
    this.idAccesorio.setValue(null, { emitEvent: false });
    this.busquedaAccesorio.setValue('', { emitEvent: false });
    this.textoBusquedaAccesorio.set('');
    this.accesoriosDisponibles.set([]);
    this.buscandoAccesorios.set(false);
    this.errorBusquedaAccesorios.set(false);
  }

  private validarOrden(): string | null {
    if (this.soloLectura()) {
      return 'Esta orden está cerrada y no admite modificaciones';
    }

    const hayNuevoEstado = !!this.busquedaEstado.value.trim();
    const estado = hayNuevoEstado ? this.estado.value : (this.orden()?.estado ?? '');
    const observaciones = this.observaciones.value.trim() || (!hayNuevoEstado ? (this.orden()?.observaciones ?? '').trim() : '');
    const requiereObs = [
      'REPARADO', 'SIN REPARACIÓN', 'ENTREGADO',
      'ENTREGADO SIN REPARAR', 'EQUIPO ABANDONADO',
      'FINALIZADO'
    ].includes(estado);

    if (requiereObs && !observaciones) {
      this.observaciones.markAsTouched();
      return 'Debes ingresar las observaciones del trabajo realizado';
    }

    if (!this.totalPendiente.value) {
      const total = Number(this.total.value);
      const abono = this.abonoPrevisto();

      if (!Number.isFinite(total) || total < 0) {
        return 'Ingrese un valor válido para el servicio';
      }
      if (!Number.isFinite(abono) || abono < 0) {
        return 'El abono no puede ser negativo';
      }
      if (abono > total) return 'Los abonos anteriores más los nuevos pagos superan el valor actualizado del servicio';

      if (
        total === 0 &&
        !['SIN REPARACIÓN', 'ENTREGADO SIN REPARAR',
          'EQUIPO ABANDONADO'].includes(estado)
      ) {
        return 'Ingrese el valor del servicio o seleccione Valor por confirmar';
      }
    }

    if (['ENTREGADO', 'FINALIZADO'].includes(estado)) {
      if (this.totalPendiente.value ||
        Number(this.total.value) <= 0) {
        return 'Confirma el valor del servicio antes de entregar el equipo';
      }
      if (this.saldo() > 0) {
        return 'No puedes entregar el equipo con saldo pendiente';
      }
    }

    if (estado === 'ENTREGADO SIN REPARAR') {
      if (this.totalPendiente.value) {
        return 'Confirma el valor del servicio antes de entregar el equipo';
      }
      if (this.saldo() > 0) {
        return 'No puedes entregar el equipo con saldo pendiente';
      }
    }

    return null;
  }

  // Solo enviar credenciales si el usuario modifica el método o el dato.
  private cambiosSeguridad(): { error: string | null; cambios: Partial<SeguridadDispositivo> } {
    const componente = this.seguridadGestion;
    if (!componente) return { error: 'No se cargó el componente de seguridad', cambios: {} };
    const actual = componente.obtenerValor();
    const inicial = this.seguridadInicial()?.tipoBloqueo ?? 'NO_REGISTRADO';
    const guardada = this.seguridadConsultada();
    const huboCambioDeTipo = actual.tipoBloqueo !== inicial;
    const cambioClave = actual.tipoBloqueo === 'CONTRASENA' && !!actual.claveDispositivo &&
      (!guardada || actual.claveDispositivo !== guardada.claveDispositivo);
    const cambioPatron = actual.tipoBloqueo === 'PATRON' && !!actual.patronDispositivo &&
      (!guardada || actual.patronDispositivo !== guardada.patronDispositivo);
    if (!huboCambioDeTipo && !cambioClave && !cambioPatron) return { error: null, cambios: {} };
    return { error: componente.validar(), cambios: actual };
  }

  textoAccion(): string {
    const estado = this.estado.value;
    if (estado === 'ENTREGADO' ||
      estado === 'ENTREGADO SIN REPARAR') {
      return 'Entregar equipo';
    }
    if (estado === 'EQUIPO ABANDONADO') return 'Cerrar orden';
    if (estado === 'REPARADO') return 'Guardar reparación';
    if (estado === 'SIN REPARACIÓN') return 'Guardar diagnóstico';
    return 'Actualizar';
  }

  seleccionarEstado(valor: EstadoOrdenTrabajo): void {
    this.estado.setValue(valor);
    this.busquedaEstado.setValue(valor, { emitEvent: false });
  }

  estadoBuscadoValido(): boolean {
    const texto = this.busquedaEstado.value.trim();
    const estado = this.estado.value;
    if (!texto || !estado) return false;
    const normalizar = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toUpperCase().trim();
    return normalizar(texto) === normalizar(estado);
  }

  guardar(): void {
    if (
      this.soloLectura() || this.guardando() ||
      this.cargando() || this.procesandoAccesorio() ||
      this.imagenesOrden?.procesando()
    ) return;

    if (this.busquedaEstado.value.trim() && !this.estadoBuscadoValido()) {
      this.notify.warning('Selecciona un estado válido de la lista o deja vacío el campo si no deseas cambiarlo.');
      return;
    }
    if (this.pagosNuevos().length && (this.consultandoPagos() || this.falloConsultaPagos())) {
      this.notify.warning('Consulta el historial de cobros antes de guardar nuevos pagos.');
      return;
    }

    const errorRecepcion = this.validarRecepcion();
    if (errorRecepcion) { this.notify.warning(errorRecepcion); return; }
    const error = this.validarOrden();
    if (error) {
      this.notify.warning(error);
      return;
    }

    const seguridad = this.cambiosSeguridad();
    if (seguridad.error) {
      this.notify.warning(seguridad.error);
      return;
    }

    const cerrando = [
      'ENTREGADO', 'ENTREGADO SIN REPARAR',
      'EQUIPO ABANDONADO', 'FINALIZADO'
    ].includes(this.estado.value);

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: cerrando
          ? 'Cerrar orden de trabajo'
          : 'Actualizar orden de trabajo',
        message: cerrando
          ? '¿Confirmas el cambio? Una vez cerrada, la orden solo podrá consultarse.'
          : '¿Deseas guardar los cambios realizados en esta orden?',
        confirmText: cerrando ? 'Confirmar cierre' : 'Actualizar'
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado && !this.guardando() &&
          !this.soloLectura()) {
          this.actualizarOrden();
        }
      });
  }

  private actualizarOrden(): void {
    if (this.guardando() || this.imagenesOrden?.procesando()) return;

    const seguridad = this.cambiosSeguridad();
    if (seguridad.error) {
      this.notify.warning(seguridad.error);
      return;
    }

    const estadoAnterior = this.orden()?.estado ?? '';
    const estadoNuevo = (this.busquedaEstado.value.trim() ? this.estado.value : this.orden()?.estado) as EstadoOrdenTrabajo;
    const ultimoId = Math.max(
      0, ...this.historialEstados().map(h => Number(h.id) || 0)
    );

    this.guardando.set(true);

    this.service.actualizar(this.data.idOrden, {
      totalPendiente: this.totalPendiente.value,
      total: this.totalPendiente.value ? 0 : Number(this.total.value),
      abono: this.totalPendiente.value ? 0 : this.abonoPrevisto(),
      abonoAnterior: Number(this.abono.value),
      pagos: [...this.pagosNuevos()],
      observaciones: this.observaciones.value.trim() || (!this.busquedaEstado.value.trim() ? this.orden()?.observaciones ?? '' : ''),
      estado: estadoNuevo,
      ...seguridad.cambios,
      ...this.datosRecepcion()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async response => {
          // La transacción confirmó la OT y los pagos. No ofrecer reenvío de un cobro ya guardado.
          this.pagosGestion?.limpiar();
          // Comprobar contra los valores realmente almacenados, no solo contra HTTP 200.
          try {
            const verificada = await firstValueFrom(this.service.obtener(this.data.idOrden));
            const actual = verificada.data;
            if (!actual) throw new Error('El servidor no devolvió la orden actualizada');
            const esperado = this.datosRecepcion();
            const errores: string[] = [];
            if (String(actual.modeloDispositivo ?? '').trim().toUpperCase() !== esperado.modeloDispositivo) errores.push('modelo');
            if (String(actual.imei ?? '').trim() !== esperado.imei) errores.push('IMEI');
            if (String(actual.danoDispositivo ?? '').trim().toUpperCase() !== esperado.danoDispositivo) errores.push('daño reportado');
            for (const campo of ['encendido', 'apagado'] as const) {
              if (this.recepcionBool(actual[campo]) !== esperado[campo]) errores.push(campo);
            }
            if (Number(actual.idTipoDispositivo ?? 0) !== esperado.idTipoDispositivo) errores.push('tipo de dispositivo');
            const idsActuales = (actual.elementosRecibidos ?? []).map(e => e.idElemento).sort((a, b) => a - b);
            const idsEsperados = [...esperado.elementosRecibidos].sort((a, b) => a - b);
            if (JSON.stringify(idsActuales) !== JSON.stringify(idsEsperados)) errores.push('elementos recibidos');
            const condicionesActuales = (actual.condicionesFisicas ?? []).map(e => e.idCondicion).sort((a, b) => a - b);
            const condicionesEsperadas = [...esperado.condicionesFisicas].sort((a, b) => a - b);
            if (JSON.stringify(condicionesActuales) !== JSON.stringify(condicionesEsperadas)) errores.push('condiciones físicas');
            if (errores.length) {
              this.guardando.set(false);
              this.notify.error('El servidor respondió correctamente, pero no persistió: ' + errores.join(', ') + '. Revisa la API Node.js desplegada.');
              this.orden.set(actual);
              return;
            }
            this.orden.set(actual);
          } catch {
            this.guardando.set(false);
            this.notify.warning('La actualización fue aceptada, incluidos los pagos. No repitas el cobro; consulta nuevamente esta orden para verificar el historial.');
            return;
          }
          try {
            if (this.imagenesOrden?.pendientes().length) {
              await this.imagenesOrden.guardarPendientes(this.data.idOrden);
            }
          } catch {
            this.guardando.set(false);
            this.notify.warning(
              'La orden se actualizó correctamente, pero no se pudieron guardar las fotografías. ' +
              'Las imágenes continúan pendientes. Puedes reintentar la carga.'
            );
            return;
          }

          this.guardando.set(false);
          this.notify.success(
            response.message ?? 'Orden actualizada correctamente'
          );

          if (estadoAnterior === estadoNuevo) {
            this.ref.close(true);
            return;
          }

          this.http.get<OrdenTrabajoEstadoHistorialResponse>(
            `/api/ordenes-trabajo/${this.data.idOrden}/historial-estados`
          )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: result => {
                const registros = result.data ?? [];
                this.historialEstados.set(registros);
                const nuevo = registros
                  .filter(h =>
                    h.estadoNuevo === estadoNuevo &&
                    Number(h.id) > ultimoId
                  )
                  .sort((a, b) =>
                    Number(b.id) - Number(a.id)
                  )[0];

                if (!nuevo?.mensajeNotificacion?.trim()) {
                  this.ref.close(true);
                  return;
                }

                this.preguntarNotificacionWhatsApp(nuevo);
              },
              error: () => {
                this.notify.warning(
                  'La orden y sus fotografías se guardaron, pero no se pudo consultar la notificación'
                );
                this.ref.close(true);
              }
            });
        },
        error: error => {
          this.guardando.set(false);
          if (!error?.status && this.pagosNuevos().length) {
            this.notify.warning('No se pudo confirmar el resultado del cobro. Consulta el historial de la orden antes de volver a intentarlo.');
            this.ref.close(true);
            return;
          }
          this.notify.error(error?.error?.message ?? 'No fue posible actualizar la orden de trabajo');
        }
      });
  }

  private preguntarNotificacionWhatsApp(
    historial: OrdenTrabajoEstadoHistorial
  ): void {
    const telefono = this.normalizarTelefonoWhatsApp(
      this.orden()?.telefono
    );
    const mensajeOriginal = historial.mensajeNotificacion?.trim();

    if (!mensajeOriginal) {
      this.ref.close(true);
      return;
    }
    if (!telefono) {
      this.notify.warning(
        'La orden se guardó, pero el teléfono del cliente no es válido para WhatsApp'
      );
      this.ref.close(true);
      return;
    }

    const estado = String(
      historial.estadoNuevo ?? ''
    ).trim().toUpperCase();

    const mostrarConfirmacion = (mensaje: string): void => {
      this.confirmarAperturaWhatsApp(
        telefono,
        mensaje,
        'Notificación al cliente',
        `La orden se actualizó a ${historial.estadoNuevo}. ¿Deseas abrir WhatsApp con el mensaje preparado?`,
        true
      );
    };

    if (this.estadosSeguimientoCerrado.includes(estado)) {
      mostrarConfirmacion(mensajeOriginal);
      return;
    }

    this.service.generarSeguimiento(this.data.idOrden)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          const url = response.data.habilitado
            ? this.obtenerUrlPublica(response.data.urlSeguimiento)
            : null;

          const mensaje = url && !mensajeOriginal.includes(url)
            ? `${mensajeOriginal}\n\nConsulta el estado de tu reparación:\n${url}`
            : mensajeOriginal;

          mostrarConfirmacion(mensaje);
        },
        error: () => {
          this.notify.warning(
            'La orden se guardó, pero no se pudo agregar el enlace de seguimiento'
          );
          mostrarConfirmacion(mensajeOriginal);
        }
      });
  }

  private normalizarTelefonoWhatsApp(
    valor: string | null | undefined
  ): string | null {
    const original = String(valor ?? '').trim();
    if (!original) return null;
    let numero = original.replace(/[^\d]/g, '');
    if (numero.startsWith('00')) numero = numero.slice(2);
    if (numero.startsWith('0') && numero.length === 10) {
      numero = `593${numero.slice(1)}`;
    } else if (numero.length === 9 && numero.startsWith('9')) {
      numero = `593${numero}`;
    }
    return /^[1-9]\d{7,14}$/.test(numero) ? numero : null;
  }

  private abrirEnlaceWhatsApp(url: string): void {
    const ventana = window.open(url, '_blank');
    if (ventana) ventana.opener = null;
    else window.location.assign(url);
  }

  agregarAccesorio(): void {
    if (this.soloLectura() || this.procesandoAccesorio()) return;
    const accesorio = this.accesorioSeleccionado();
    if (!accesorio) {
      this.notify.warning('Seleccione un accesorio');
      return;
    }

    const cantidad = Number(this.cantidadAccesorio.value);
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      this.notify.warning('Ingrese una cantidad válida');
      return;
    }
    if (cantidad > Number(accesorio.cantidadStock)) {
      this.notify.warning(
        `Stock insuficiente. Disponible: ${accesorio.cantidadStock}`
      );
      return;
    }

    this.procesandoAccesorio.set(true);
    this.service.agregarAccesorio(this.data.idOrden, {
      idAccesorio: accesorio.id, cantidad
    })
      .pipe(
        finalize(() => this.procesandoAccesorio.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          this.notify.success(response.message);
          this.limpiarBusquedaAccesorio();
          this.cantidadAccesorio.setValue(1);
          this.cargarAccesorios();
        },
        error: error => {
          this.notify.error(
            error?.error?.message ?? 'No fue posible agregar el accesorio'
          );
        }
      });
  }

  eliminarAccesorio(accesorio: AccesorioUsadoOrden): void {
    if (this.soloLectura() || this.procesandoAccesorio()) return;

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar accesorio',
        message: `¿Deseas retirar "${accesorio.accesorio}" de esta orden?`,
        confirmText: 'Eliminar'
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (!confirmado || this.soloLectura() ||
          this.procesandoAccesorio()) return;

        this.procesandoAccesorio.set(true);
        this.service.eliminarAccesorio(
          this.data.idOrden, accesorio.id
        )
          .pipe(
            finalize(() => this.procesandoAccesorio.set(false)),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe({
            next: response => {
              this.notify.success(response.message);
              this.cargarAccesorios();
            },
            error: error => {
              this.notify.error(
                error?.error?.message ??
                'No fue posible eliminar el accesorio'
              );
            }
          });
      });
  }

  private cargarAccesorios(): void {
    this.service.listarAccesoriosOrden(this.data.idOrden)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.accesoriosUsados.set(response.data ?? []);
          this.limpiarBusquedaAccesorio();
        },
        error: error => {
          this.notify.error(
            error?.error?.message ??
            'No fue posible actualizar los accesorios'
          );
        }
      });
  }

  cerrar(): void {
    if (this.guardando() || this.imagenesOrden?.procesando()) return;
    this.seguridadConsultada.set(null);
    this.ref.close(false);
  }

  // SEGUIMIENTO PÚBLICO
  readonly compartiendoSeguimiento = signal(false);

  private readonly estadosSeguimientoCerrado = [
    'ENTREGADO', 'ENTREGADO SIN REPARAR',
    'EQUIPO ABANDONADO', 'FINALIZADO'
  ];

  private obtenerUrlPublica(
    urlServidor: string | null
  ): string | null {
    if (!urlServidor) return null;

    try {
      const token = new URL(
        urlServidor, window.location.origin
      ).pathname.split('/').filter(Boolean).pop() ?? '';

      if (!/^[a-f0-9]{64}$/.test(token)) return null;
      return new URL(
        `seguimiento/${token}`, document.baseURI
      ).href;
    } catch {
      return null;
    }
  }

  compartirSeguimiento(): void {
    if (
      this.cargando() ||
      this.guardando() ||
      this.compartiendoSeguimiento()
    ) return;

    if (this.soloLectura()) {
      this.notify.warning(
        'El seguimiento está deshabilitado para órdenes cerradas'
      );
      return;
    }

    this.compartiendoSeguimiento.set(true);
    this.service.prepararMensajeSeguimiento(this.data.idOrden)
      .pipe(
        finalize(() => this.compartiendoSeguimiento.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          const datos = response.data;
          const numero = this.normalizarTelefonoWhatsApp(
            datos.telefono
          );

          if (!numero) {
            this.notify.warning(
              'El cliente no tiene un teléfono válido para WhatsApp'
            );
            return;
          }

          const token = datos.urlSeguimiento
            .split('/').filter(Boolean).pop() ?? '';

          if (!/^[a-f0-9]{64}$/.test(token)) {
            this.notify.error('El backend no devolvió un token válido');
            return;
          }

          const urlPublica = new URL(
            `seguimiento/${token}`, document.baseURI
          ).href;
          const mensaje = datos.mensaje.replaceAll(
            '{URL_SEGUIMIENTO}', urlPublica
          );

          this.confirmarAperturaWhatsApp(
            numero,
            mensaje,
            'Compartir seguimiento',
            '¿Deseas abrir WhatsApp con el mensaje configurado y el enlace de seguimiento?',
            false
          );
        },
        error: error => {
          this.notify.error(
            error?.error?.message ??
            'No fue posible preparar la notificación de seguimiento'
          );
        }
      });
  }

  private confirmarAperturaWhatsApp(
    telefono: string,
    mensaje: string,
    titulo: string,
    pregunta: string,
    cerrarGestion: boolean
  ): void {
    const urlWhatsApp =
      `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    const confirmacion = this.dialog.open(ConfirmDialog, {
      width: '450px',
      maxWidth: '94vw',
      disableClose: true,
      autoFocus: false,
      data: {
        title: titulo,
        message: pregunta,
        confirmText: 'Sí, abrir WhatsApp',
        cancelText: 'No, gracias'
      }
    });

    confirmacion.beforeClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(acepto => {
        if (acepto === true) {
          this.abrirEnlaceWhatsApp(urlWhatsApp);
        }
      });

    if (cerrarGestion) {
      confirmacion.afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.ref.close(true));
    }
  }
}