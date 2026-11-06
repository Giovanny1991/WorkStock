import {
  Component, computed, DestroyRef, inject,
  OnInit, signal, ViewChild
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  catchError, debounceTime, distinctUntilChanged, firstValueFrom, interval,
  filter, finalize, map, of, switchMap, tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogosOrdenService, CatalogoOrden, TipoDispositivoOrden, ElementoRecibidoOrden, CondicionFisicaOrden } from '../catalogos-orden/catalogos-orden.service';
import { CatalogosOrdenDialog } from '../catalogos-orden/catalogos-orden-dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Cliente } from '../../clientes/cliente.model';
import { ClientesService } from '../../clientes/clientes.service';
import { ClienteDialog } from '../../clientes/cliente-dialog/cliente-dialog';
import { identificacionClienteFormatoValido } from '../../clientes/cliente-identificacion';
import { ClienteSeleccionadoComponent } from '../../clientes/cliente-seleccionado/cliente-seleccionado';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { OrdenTrabajoDetalleComponent } from '../orden-trabajo-detalle/orden-trabajo-detalle';
import { OrdenTrabajoImagenesComponent } from '../orden-trabajo-imagenes/orden-trabajo-imagenes';
import { OrdenTrabajoSeguridadComponent } from '../orden-trabajo-seguridad/orden-trabajo-seguridad';
import { OrdenTrabajoQrBorradorDialog } from '../orden-trabajo-qr/orden-trabajo-qr-borrador-dialog';
import { PagosEditorComponent } from '../../../shared/pagos-editor/pagos-editor';
import type { PagoCaptura } from '../../../shared/pagos-editor/pagos-editor.model';
import { ConsultaBorradorQr, OrdenTrabajoQrBorradorService, SesionBorradorQr } from '../orden-trabajo-qr/orden-trabajo-qr-borrador.service';

@Component({
  selector: 'app-nueva-orden',
  standalone: true,
  imports: [
    ClienteSeleccionadoComponent,
    PagosEditorComponent,
    OrdenTrabajoImagenesComponent,
    OrdenTrabajoSeguridadComponent,
    CurrencyPipe, ReactiveFormsModule,
    MatAutocompleteModule, MatButtonModule, MatCheckboxModule,
    MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatRadioModule, MatSelectModule, MatTooltipModule
  ],
  templateUrl: './nueva-orden.html',
  styleUrl: './nueva-orden.scss'
})
export class NuevaOrden implements OnInit {
  @ViewChild('pagosInicial') pagosInicial?: PagosEditorComponent;
  readonly pagosCapturados = signal<PagoCaptura[]>([]);
  onPagosChange(pagos: PagoCaptura[]): void {
    this.pagosCapturados.set(pagos);
    this.abono.setValue(Number((pagos.reduce((s,p)=>s+Math.round(p.valor*100),0)/100).toFixed(2)));
  }
  @ViewChild(OrdenTrabajoImagenesComponent)
  galeria?: OrdenTrabajoImagenesComponent;

  @ViewChild('seguridadOrden')
  seguridadOrden?: OrdenTrabajoSeguridadComponent;

  private readonly clientesService = inject(ClientesService);
  private readonly service = inject(OrdenesTrabajoService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalogos = inject(CatalogosOrdenService);
  private readonly authService = inject(AuthService);
  private readonly qrBorradorService = inject(OrdenTrabajoQrBorradorService);
  readonly esAdministrador = computed(() => this.authService.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR');
  readonly tiposDispositivo = signal<TipoDispositivoOrden[]>([]);
  readonly elementosCatalogo = signal<ElementoRecibidoOrden[]>([]);
  readonly elementosSeleccionados = signal<number[]>([]);
  readonly condicionesCatalogo = signal<CondicionFisicaOrden[]>([]);
  readonly condicionesSeleccionadas = signal<number[]>([]);
  readonly cargandoCatalogos = signal(false);
  readonly idTipoDispositivo = new FormControl<number | null>(null);
  cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.catalogos.listarTipos().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoCatalogos.set(false)))
      .subscribe({ next: r => this.tiposDispositivo.set(r.data), error: e => this.notify.error(e?.error?.message ?? 'No se cargaron los tipos de dispositivo') });
    this.catalogos.listarElementos().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: r => this.elementosCatalogo.set(r.data), error: e => this.notify.error(e?.error?.message ?? 'No se cargaron los elementos recibidos') });
    this.catalogos.listarCondiciones().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: r => this.condicionesCatalogo.set(r.data), error: e => this.notify.error(e?.error?.message ?? 'No se cargaron las condiciones físicas') });
  }
  gestionarCatalogo(tipo: CatalogoOrden): void {
    if (!this.esAdministrador()) return;
    this.dialog.open(CatalogosOrdenDialog, { width: '620px', maxWidth: '95vw', autoFocus: false, data: tipo })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(cambio => {
        if (cambio) {
          const tipoSeleccionado = this.idTipoDispositivo.value;
          this.cargarCatalogos();
          if (tipo === 'tipos') this.idTipoDispositivo.setValue(tipoSeleccionado);
        }
      });
  }
  seleccionarElemento(id: number, seleccionado: boolean): void {
    this.elementosSeleccionados.update(actual => seleccionado ? [...new Set([...actual, id])] : actual.filter(x => x !== id));
  }

  seleccionarCondicion(id: number, seleccionado: boolean): void {
    this.condicionesSeleccionadas.update(actual => seleccionado ? [...new Set([...actual, id])] : actual.filter(x => x !== id));
  }

  // CLIENTES
  readonly clientes = signal<Cliente[]>([]);
  readonly clientesFiltrados = signal<Cliente[]>([]);
  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly idCliente = signal(0);
  readonly busquedaCliente = signal('');
  readonly buscandoClientes = signal(false);
  readonly errorBusquedaClientes = signal(false);
  readonly clienteTexto = new FormControl<string | Cliente>('', { nonNullable: true });
  private versionBusquedaCliente = 0;

  // ESTADO GENERAL
  readonly guardando = signal(false);
  readonly ultimaOrdenRegistrada = signal<number | null>(null);

  readonly creandoQrBorrador = signal(false);
  readonly sesionesBorrador = signal<SesionBorradorQr[]>([]);
  readonly qrActivo = signal<SesionBorradorQr | null>(null);
  readonly resumenQr = signal<ConsultaBorradorQr | null>(null);
  readonly vinculacionesPendientes = signal<{idOrden:number; sesiones:SesionBorradorQr[]} | null>(null);
  readonly vinculandoQr = signal(false);
  constructor() {
    interval(5000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const activo=this.qrActivo();
      if (!activo || this.guardando() || this.vinculandoQr()) return;
      this.qrBorradorService.consultar(activo.token).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({next:r=>this.resumenQr.set(r.data),error:()=>{}});
    });
  }
  actualizarFotografiasQr(): void {
    const activa = this.qrActivo();
    if (!activa || this.guardando() || this.vinculandoQr()) return;
    this.qrBorradorService.consultar(activa.token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: respuesta => {
        if (this.qrActivo()?.token === activa.token) this.resumenQr.set(respuesta.data);
      },
      error: error => this.notify.warning(error?.error?.message ?? 'No se pudo actualizar la lista de fotografías QR')
    });
  }
  abrirQrFotos(): void {
    if (this.guardando() || this.vinculandoQr() || this.creandoQrBorrador()) return;
    const sesion=this.qrActivo();
    if (sesion && new Date(sesion.FechaExpiracion).getTime() > Date.now()) { this.mostrarDialogoQr(sesion); return; }
    this.generarQrNuevo();
  }
  generarQrNuevo(): void {
    if (this.creandoQrBorrador() || this.guardando() || this.vinculandoQr()) return;
    if (this.vinculacionesPendientes()) {this.notify.warning('Primero vincula las fotografías pendientes a la orden anterior.');return;}
    this.creandoQrBorrador.set(true);
    this.qrBorradorService.crear().pipe(finalize(()=>this.creandoQrBorrador.set(false)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next:r=>{
        const sesion=r.data;
        if(!sesion?.token || !sesion.idSesion){this.notify.error('El servidor no devolvió una sesión QR válida.');return;}
        this.sesionesBorrador.update(actual=>[...actual,sesion]);
        this.qrActivo.set(sesion);this.resumenQr.set(null);this.mostrarDialogoQr(sesion);
      },error:e=>this.notify.error(e?.error?.message??'No fue posible crear el QR temporal')
    });
  }
  private mostrarDialogoQr(sesion:SesionBorradorQr):void {
    this.dialog.open(OrdenTrabajoQrBorradorDialog,{width:'440px',maxWidth:'95vw',autoFocus:false,data:sesion});
  }
  reintentarVinculacion():void {
    const pendiente=this.vinculacionesPendientes();
    if (!pendiente || this.vinculandoQr()) return;
    void this.vincularSesiones(pendiente.idOrden,pendiente.sesiones,true);
  }
  private async vincularSesiones(idOrden:number,sesiones:SesionBorradorQr[],reintento=false):Promise<boolean> {
    if (!sesiones.length) {this.vinculacionesPendientes.set(null);return true;}
    this.vinculandoQr.set(true);
    let vinculadas=0;
    const restantes:SesionBorradorQr[]=[];
    for (let i=0;i<sesiones.length;i++) {
      try {const respuesta=await firstValueFrom(this.qrBorradorService.vincular(sesiones[i].idSesion,idOrden));vinculadas+=respuesta.data?.fotografiasVinculadas??0;}
      catch {restantes.push(...sesiones.slice(i));break;}
    }
    this.vinculandoQr.set(false);
    if(restantes.length){
      this.vinculacionesPendientes.set({idOrden,sesiones:restantes});
      this.notify.warning(`Orden #${idOrden} guardada. Hay fotografías QR pendientes de vincular. Usa Reintentar vinculación; NO vuelvas a registrar la orden.`);
      return false;
    }
    this.vinculacionesPendientes.set(null);
    this.sesionesBorrador.set([]);this.qrActivo.set(null);this.resumenQr.set(null);
    if (reintento) this.notify.success(`${vinculadas} fotografía(s) QR vinculadas a la orden #${idOrden}`);
    return true;
  }

  // EQUIPO RECIBIDO
  readonly modelo = new FormControl('', { nonNullable: true });
  readonly imei = new FormControl('', { nonNullable: true });
  readonly dano = new FormControl('', { nonNullable: true });
  readonly estadoRecepcion = new FormControl<'ENCENDIDO' | 'APAGADO' | null>(null);

  // ELEMENTOS RECIBIDOS

  // VALORES
  readonly totalPendiente = new FormControl(false, { nonNullable: true });
  readonly total = new FormControl(0, { nonNullable: true });
  readonly abono = new FormControl(0, { nonNullable: true });

  saldo(): number {
    if (this.totalPendiente.value) return 0;
    const total = Number(this.total.value || 0);
    const abono = Number(this.abono.value || 0);
    return Math.max(total - abono, 0);
  }

  // VALIDACIÓN DE CLIENTE EXISTENTE
  readonly clienteExiste = computed(() => {
    const identificacion = this.busquedaCliente().trim().toUpperCase();
    return this.clientes().some(
      cliente => cliente.identificacion.toUpperCase() === identificacion
    );
  });

  readonly puedeRegistrarCliente = computed(() => {
    const valor = this.busquedaCliente().trim().toUpperCase();
    return (
      identificacionClienteFormatoValido(valor) &&
      !this.buscandoClientes() &&
      !this.errorBusquedaClientes() &&
      !this.clienteExiste() &&
      !this.clienteSeleccionado()
    );
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.configurarBusquedaClientes();
    this.configurarValorPendiente();
  }

  descripcionCliente(cliente: Cliente): string {
    return `${cliente.identificacion} - ${cliente.nombreCliente}`;
  }

  readonly mostrarCliente = (valor: string | Cliente | null): string => {
    if (!valor) return '';
    if (typeof valor === 'string') return valor;
    return this.descripcionCliente(valor);
  };

  // BÚSQUEDA REMOTA DE CLIENTES
  private configurarBusquedaClientes(): void {
    this.clienteTexto.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        tap(valor => {
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
        map(valor => valor.trim()),
        distinctUntilChanged(),
        switchMap(texto => {
          const version = this.versionBusquedaCliente;
          if (texto.length < 2 || this.clienteSeleccionado()) {
            this.buscandoClientes.set(false);
            return of<Cliente[]>([]);
          }

          this.buscandoClientes.set(true);
          return this.clientesService.buscarParaAutocomplete(texto).pipe(
            map(response => {
              if (version !== this.versionBusquedaCliente) return [];
              return response.data ?? [];
            }),
            catchError(error => {
              if (version === this.versionBusquedaCliente) {
                this.errorBusquedaClientes.set(true);
                this.notify.error(
                  error?.error?.message ?? 'No fue posible buscar los clientes'
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
        if (this.clienteSeleccionado()) return;
        this.clientes.set(clientes);
        this.clientesFiltrados.set(clientes);
      });
  }

  seleccionarCliente(cliente: Cliente): void {
    if (
      !cliente ||
      !Number.isSafeInteger(Number(cliente.id)) ||
      Number(cliente.id) <= 0
    ) {
      this.notify.warning('No fue posible identificar el cliente seleccionado');
      return;
    }
    this.establecerCliente(cliente);
  }

  private establecerCliente(cliente: Cliente): void {
    this.versionBusquedaCliente++;
    this.idCliente.set(Number(cliente.id));
    this.clienteSeleccionado.set(cliente);
    this.busquedaCliente.set(cliente.identificacion);
    this.clientes.set([cliente]);
    this.clientesFiltrados.set([]);
    this.buscandoClientes.set(false);
    this.errorBusquedaClientes.set(false);
    this.clienteTexto.setValue(cliente, { emitEvent: false });
  }

  registrarCliente(): void {
    if (!this.puedeRegistrarCliente()) return;
    const identificacion = this.busquedaCliente();

    this.dialog.open(ClienteDialog, {
      width: '600px',
      maxWidth: '94vw',
      disableClose: true,
      autoFocus: false,
      data: { identificacionInicial: identificacion }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (!resultado || resultado === true) return;
        this.establecerCliente(resultado as Cliente);
      });
  }

  editarCliente(): void {
    const cliente = this.clienteSeleccionado();
    if (!cliente) return;

    this.dialog.open(ClienteDialog, {
      width: '600px',
      maxWidth: '94vw',
      disableClose: true,
      autoFocus: false,
      data: { cliente }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (!resultado) return;

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

  // VALOR POR CONFIRMAR
  private configurarValorPendiente(): void {
    this.totalPendiente.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(pendiente => {
        if (pendiente) {
          this.total.setValue(0, { emitEvent: false });
          this.pagosInicial?.limpiar();
          this.abono.setValue(0, { emitEvent: false });
        }
      });
  }

  // CONFIRMAR REGISTRO
  guardar(): void {
    if (this.guardando() || this.vinculandoQr()) return;
    if (this.vinculacionesPendientes()) { this.notify.warning('Debes resolver primero las fotografías pendientes de la orden ya guardada.'); return; }

    const error = this.validar();
    if (error) {
      this.notify.warning(error);
      return;
    }

    // VALIDACIÓN DE SEGURIDAD DEL DISPOSITIVO
    const errorSeguridad = this.seguridadOrden?.validar();
    if (errorSeguridad) {
      this.notify.warning(errorSeguridad);
      return;
    }
    if (!this.seguridadOrden) {
      this.notify.error('No fue posible cargar la seguridad del dispositivo');
      return;
    }

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Confirmar orden de trabajo',
        message: '¿Desea registrar esta orden de trabajo?',
        confirmText: 'Registrar'
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (!confirmado || this.guardando()) return;
        this.registrar();
      });
  }

  // REGISTRAR ORDEN Y CARGAR FOTOGRAFÍAS
  private registrar(): void {
    const recepcion = this.estadoRecepcion.value;
    const seguridad = this.seguridadOrden?.obtenerValor();

    if (!seguridad) {
      this.notify.error('No fue posible obtener la seguridad del dispositivo');
      return;
    }

    this.guardando.set(true);
    this.service.crear({
      idCliente: this.idCliente(),
      idTipoDispositivo: this.idTipoDispositivo.value!,
      elementosRecibidos: this.elementosSeleccionados(),
      condicionesFisicas: this.condicionesSeleccionadas(),
      modeloDispositivo: this.modelo.value.trim(),
      imei: this.imei.value.trim(),
      danoDispositivo: this.dano.value.trim(),
      encendido: recepcion === 'ENCENDIDO',
      apagado: recepcion === 'APAGADO',
      totalPendiente: this.totalPendiente.value,
      total: this.totalPendiente.value ? 0 : Number(this.total.value),
      abono: this.totalPendiente.value ? 0 : Number(this.abono.value),
      pagos: this.pagosCapturados(),
      ...seguridad
    })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: async response => {
          const idOrden = response.data.idOrden;
          this.ultimaOrdenRegistrada.set(idOrden);

          let falloFotosLocales=false;
          try {await this.galeria?.guardarPendientes(idOrden);}
          catch {falloFotosLocales=true;}
          const qrVinculado=await this.vincularSesiones(idOrden,this.sesionesBorrador());
          if (falloFotosLocales) this.notify.warning(`Orden #${idOrden} registrada, pero algunas fotografías seleccionadas en el computador no se subieron.`);
          if (!qrVinculado) { this.limpiar(); this.visualizarOrden(idOrden); return; }
          this.notify.success(
            `${response.message} - N.º ${idOrden}`
          );

          this.limpiar();
          this.visualizarOrden(idOrden);
        },
        error: error => {
          this.notify.error(
            error?.error?.message ??
            'No fue posible registrar la orden de trabajo'
          );
        }
      });
  }

  // VALIDAR CAMPOS DE LA ORDEN
  private validar(): string | null {
    if (this.idCliente() <= 0) return 'Seleccione un cliente';

    if (!this.idTipoDispositivo.value || !this.tiposDispositivo().some(t => t.id === this.idTipoDispositivo.value)) return 'Seleccione un tipo de dispositivo válido';

    if (this.modelo.value.trim().length < 3) {
      return 'El modelo debe tener mínimo 3 caracteres';
    }

    if (this.imei.value.length > 20) return 'El IMEI o número de serie admite máximo 20 caracteres';

    if (this.dano.value.trim().length < 3) {
      return 'Ingrese el daño reportado del dispositivo';
    }

    if (!this.estadoRecepcion.value) {
      return 'Seleccione si el equipo fue recibido encendido o apagado';
    }

    if (!this.totalPendiente.value) {
      const total = Number(this.total.value);
      const abono = Number(this.abono.value);

      if (total <= 0) {
        return 'Ingrese el valor del servicio o marque Valor por confirmar';
      }
      if (abono < 0) return 'El abono no puede ser negativo';
      if (abono > total) {
        return 'El abono no puede ser mayor al valor del servicio';
      }
    }

    return null;
  }

  // LIMPIAR FORMULARIO
  limpiar(): void {
    this.versionBusquedaCliente++;
    this.idCliente.set(0);
    this.clienteSeleccionado.set(null);
    this.busquedaCliente.set('');
    this.clientes.set([]);
    this.clientesFiltrados.set([]);
    this.buscandoClientes.set(false);
    this.errorBusquedaClientes.set(false);
    this.clienteTexto.setValue('', { emitEvent: false });

    this.idTipoDispositivo.setValue(null);
    this.elementosSeleccionados.set([]);
    this.condicionesSeleccionadas.set([]);
    this.modelo.setValue('');
    this.imei.setValue('');
    this.dano.setValue('');
    this.estadoRecepcion.setValue(null);
    this.totalPendiente.setValue(false, { emitEvent: false });
    this.total.setValue(0);
    this.abono.setValue(0);
    this.pagosInicial?.limpiar();

    // REINICIAR SEGURIDAD
    this.seguridadOrden?.reiniciar();
  }

  // VISUALIZAR TICKET DE LA ORDEN
  visualizarOrden(idOrden: number): void {
    this.dialog.open(OrdenTrabajoDetalleComponent, {
      width: '430px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: { idOrden }
    });
  }
}