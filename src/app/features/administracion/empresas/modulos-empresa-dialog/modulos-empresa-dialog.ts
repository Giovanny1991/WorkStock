import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Empresa } from '../../administracion.model';
import { ModulosEmpresaService, ModuloSistemaEmpresa } from '../../modulos-empresa.service';
import { NotificationService } from '../../../../core/services/notification';
import { EstadoSwitch } from '../../../../shared/estado-switch/estado-switch';
import { ConfirmDialog } from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';

interface FilaModulo { modulo: ModuloSistemaEmpresa; nivel: number; codigosDisponibles: string[]; disponible: boolean; asignable: boolean; }
interface GrupoModulo { modulo: ModuloSistemaEmpresa; filas: FilaModulo[]; codigosDisponibles: string[]; }

@Component({
  selector: 'app-modulos-empresa-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule, EstadoSwitch],
  templateUrl: './modulos-empresa-dialog.html',
  styleUrl: './modulos-empresa-dialog.scss'
})
export class ModulosEmpresaDialog implements OnInit {
  private readonly service = inject(ModulosEmpresaService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject<MatDialogRef<ModulosEmpresaDialog, boolean>>(MatDialogRef);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly empresa = inject<Empresa>(MAT_DIALOG_DATA);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  private readonly catalogo = signal<ModuloSistemaEmpresa[]>([]);
  readonly seleccion = signal<ReadonlySet<string>>(new Set<string>());
  private readonly seleccionInicial = signal<ReadonlySet<string>>(new Set<string>());

  readonly grupos = computed<GrupoModulo[]>(() => {
    const elementos = this.catalogo();
    const hijos = new Map<string | null, ModuloSistemaEmpresa[]>();
    for (const elemento of elementos) {
      const padre = elemento.codigoPadre ?? null;
      const lista = hijos.get(padre) ?? [];
      lista.push(elemento);
      hijos.set(padre, lista);
    }
    const ordenados = (padre: string | null): ModuloSistemaEmpresa[] =>
      (hijos.get(padre) ?? []).slice().sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
    const armar = (modulo: ModuloSistemaEmpresa, nivel: number, padresActivos: boolean): { filas: FilaModulo[]; codigos: string[] } => {
      const vigente = padresActivos && Boolean(modulo.activo);
      const asignable = Boolean(modulo.esAsignable);
      const descendientes = ordenados(modulo.codigo).map(hijo => armar(hijo, nivel + 1, vigente));
      const codigos = asignable && vigente ? [modulo.codigo] : [];
      for (const hijo of descendientes) codigos.push(...hijo.codigos);
      const fila: FilaModulo = { modulo, nivel, codigosDisponibles: codigos, disponible: vigente, asignable };
      return { filas: [fila, ...descendientes.flatMap(x => x.filas)], codigos };
    };
    return ordenados(null).map(raiz => {
      const construccion = armar(raiz, 0, true);
      return { modulo: raiz, filas: construccion.filas.slice(1), codigosDisponibles: construccion.codigos };
    });
  });
  readonly totalDisponibles = computed(() => this.grupos().reduce((n, g) => n + g.codigosDisponibles.length, 0));
  readonly totalSeleccionados = computed(() => this.grupos().reduce((n, g) => n + g.codigosDisponibles.filter(c => this.seleccion().has(c)).length, 0));
  readonly cambiosPendientes = computed(() => {
    const actual = this.seleccion(), original = this.seleccionInicial();
    return actual.size !== original.size || [...actual].some(x => !original.has(x));
  });

  ngOnInit(): void { this.cargar(); }
  cargar(): void {
    if (this.guardando()) return;
    this.error.set('');
    this.cargando.set(true);
    this.service.consultar(this.empresa.id)
      .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          const datos = respuesta.data;
          this.catalogo.set(datos?.catalogo ?? []);
          const disponibles = new Set(this.grupos().flatMap(g => g.codigosDisponibles));
          const asignados = new Set<string>((datos?.catalogo ?? [])
            .filter(m => Boolean(m.esAsignable) && Boolean(m.habilitado) && disponibles.has(m.codigo))
            .map(m => m.codigo));
          this.seleccion.set(asignados);
          this.seleccionInicial.set(new Set(asignados));
        },
        error: err => this.error.set(err?.error?.message ?? 'No se pudieron consultar los módulos de esta empresa.')
      });
  }
  cantidad(grupo: { codigosDisponibles: string[] }): number {
    return grupo.codigosDisponibles.filter(c => this.seleccion().has(c)).length;
  }
  activo(grupo: { codigosDisponibles: string[] }): boolean {
    return grupo.codigosDisponibles.length > 0 && this.cantidad(grupo) === grupo.codigosDisponibles.length;
  }
  cambiar(grupo: { codigosDisponibles: string[] }): void {
    if (this.cargando() || this.guardando() || !grupo.codigosDisponibles.length) return;
    const nuevo = new Set(this.seleccion());
    const todos = this.activo(grupo);
    for (const codigo of grupo.codigosDisponibles) {
      if (todos) nuevo.delete(codigo);
      else nuevo.add(codigo);
    }
    this.seleccion.set(nuevo);
  }
  seleccionarTodos(habilitar: boolean): void {
    if (this.cargando() || this.guardando()) return;
    this.seleccion.set(new Set(habilitar ? this.grupos().flatMap(g => g.codigosDisponibles) : []));
  }
  cancelar(): void {
    if (this.guardando()) return;
    if (!this.cambiosPendientes()) { this.dialogRef.close(false); return; }
    this.dialog.open(ConfirmDialog, { width: '440px', maxWidth: '94vw', data: {
      title: 'Descartar cambios', message: 'Tienes módulos modificados sin guardar. ¿Quieres cerrar y descartar esos cambios?', confirmText: 'Descartar', type: 'warning'
    }}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(acepta => { if (acepta) this.dialogRef.close(false); });
  }
  guardar(): void {
    if (this.cargando() || this.guardando() || this.error() || !this.cambiosPendientes()) return;
    const cantidad = this.totalSeleccionados();
    this.dialog.open(ConfirmDialog, { width: '440px', maxWidth: '94vw', data: {
      title: 'Actualizar módulos de la empresa',
      message: `¿Guardar ${cantidad} submódulo(s) habilitado(s) para ${this.empresa.nombreEmpresa}? Las opciones deshabilitadas dejarán de estar disponibles cuando se active la protección de rutas y API.`,
      confirmText: 'Guardar permisos', type: 'update'
    }}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(acepta => {
      if (!acepta || this.guardando()) return;
      this.guardando.set(true);
      const codigos = [...this.seleccion()].sort();
      this.service.guardar(this.empresa.id, codigos)
        .pipe(finalize(() => this.guardando.set(false)), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: respuesta => {
            this.notify.success(respuesta.message ?? 'Módulos de la empresa actualizados.');
            this.dialogRef.close(true);
          },
          error: err => this.notify.error(err?.error?.message ?? 'No se pudieron guardar los permisos de la empresa.')
        });
    });
  }
}
