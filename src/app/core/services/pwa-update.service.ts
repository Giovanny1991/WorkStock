
import {
    ApplicationRef,
    Component,
    Injectable,
    inject,
    signal
} from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import {
    MatDialog,
    MatDialogModule,
    MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { concat, first, interval } from 'rxjs';

/* =====================================================
   WORKSTOCK - DIÁLOGO DE ACTUALIZACIÓN
===================================================== */
@Component({
    selector: 'app-pwa-update-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, MatIconModule],
    template: `
    <div class="pwa-dialog">
      <div class="pwa-icon">
        <mat-icon>system_update_alt</mat-icon>
      </div>
      <h2>Nueva versión disponible</h2>
      <p>Hay una nueva versión de WorkStock lista para instalar.</p>
      <div class="pwa-notice">
        <mat-icon>info_outline</mat-icon>
        <span>Guarda cualquier información pendiente antes de actualizar.</span>
      </div>
      <div class="pwa-actions">
        <button mat-button type="button" (click)="cerrar(false)">
          Más tarde
        </button>
        <button mat-flat-button type="button" (click)="cerrar(true)">
          <mat-icon>refresh</mat-icon>
          Actualizar ahora
        </button>
      </div>
    </div>
  `,
    styles: [`
    .pwa-dialog{padding:28px;text-align:center;max-width:420px;box-sizing:border-box}
    .pwa-icon{width:60px;height:60px;background:#eaf3fd;color:#075DB0;border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
    .pwa-icon mat-icon{width:30px;height:30px;font-size:30px}
    h2{margin:0 0 10px;font-size:21px;font-weight:700;color:#24364b}
    p{margin:0 0 18px;font-size:14px;line-height:1.6;color:#66788a}
    .pwa-notice{display:flex;align-items:center;text-align:left;gap:9px;background:#f3f7fc;padding:12px;border-radius:9px;color:#52677d;font-size:12px;line-height:1.5}
    .pwa-notice mat-icon{color:#075DB0;flex-shrink:0}
    .pwa-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:22px}
    .pwa-actions button{border-radius:8px}
    .pwa-actions button[mat-flat-button]{background:#075DB0;color:#fff}
    @media(max-width:420px){.pwa-dialog{padding:20px}.pwa-actions{justify-content:center}}
  `]
})
export class PwaUpdateDialog {
    private readonly ref = inject(MatDialogRef<PwaUpdateDialog>);

    cerrar(actualizar: boolean): void {
        this.ref.close(actualizar);
    }
}

/* =====================================================
   WORKSTOCK - SERVICIO DE ACTUALIZACIONES PWA
===================================================== */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
    private readonly appRef = inject(ApplicationRef);
    private readonly swUpdate = inject(SwUpdate);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    private readonly claveRecarga = 'workstock-pwa-recarga';

    readonly verificando = signal(false);
    readonly actualizacionDisponible = signal(false);
    readonly soporteDisponible = this.swUpdate.isEnabled;

    private iniciado = false;
    private avisoAbierto = false;
    private pospuesto = false;
    private comprobacionActual: Promise<boolean> | null = null;

    /* ===================================================
       INICIALIZACIÓN AUTOMÁTICA
    =================================================== */
    iniciar(): void {
        if (this.iniciado) return;
        this.iniciado = true;

        // Mensaje después de una recarga solicitada por actualización.
        try {
            if (sessionStorage.getItem(this.claveRecarga) === '1') {
                sessionStorage.removeItem(this.claveRecarga);
                this.mostrarMensaje(
                    'WorkStock se reinició para cargar la nueva versión.'
                );
            }
        } catch {
            // El almacenamiento del navegador puede estar restringido.
        }

        if (!this.swUpdate.isEnabled) return;

        this.swUpdate.versionUpdates.subscribe(event => {
            switch (event.type) {
                case 'VERSION_READY':
                    this.actualizacionDisponible.set(true);
                    this.mostrarAviso();
                    break;

                case 'VERSION_INSTALLATION_FAILED':
                    console.error(
                        'WorkStock PWA: error al instalar la versión:',
                        event.error
                    );
                    this.mostrarMensaje(
                        'No se pudo descargar la actualización de WorkStock.'
                    );
                    break;
            }
        });

        this.swUpdate.unrecoverable.subscribe(event => {
            console.error(
                'WorkStock PWA: versión irrecuperable:',
                event.reason
            );
            this.mostrarMensaje(
                'WorkStock necesita recargarse para recuperar su funcionamiento.'
            );
        });

        // Primera comprobación cuando Angular esté estable.
        // Las siguientes, cada 60 minutos.
        const estable$ = this.appRef.isStable.pipe(
            first(estable => estable)
        );
        const cadaHora$ = interval(60 * 60 * 1000);

        concat(estable$, cadaHora$).subscribe(() => {
            void this.comprobar(false);
        });
    }

    /* ===================================================
       BOTÓN MANUAL - BUSCAR ACTUALIZACIONES
    =================================================== */
    async verificarActualizaciones(): Promise<void> {
        this.iniciar();

        if (!this.swUpdate.isEnabled) {
            this.mostrarMensaje(
                'La verificación PWA no está disponible en este entorno.'
            );
            return;
        }

        if (this.verificando()) return;

        this.verificando.set(true);

        try {
            // Si ya está descargada, permite volver a mostrar el aviso.
            if (this.actualizacionDisponible()) {
                this.pospuesto = false;
                this.mostrarAviso();
                return;
            }

            const disponible = await this.comprobar(true);

            if (disponible || this.actualizacionDisponible()) {
                this.actualizacionDisponible.set(true);
                this.pospuesto = false;
                this.mostrarAviso();
            } else {
                this.mostrarMensaje(
                    'WorkStock está actualizado. No hay nuevas versiones disponibles.'
                );
            }
        } catch {
            // El método comprobar() ya informa del error.
        } finally {
            this.verificando.set(false);
        }
    }

    /* ===================================================
       COMPROBAR EN EL SERVICE WORKER
    =================================================== */
    private comprobar(manual: boolean): Promise<boolean> {
        if (!this.swUpdate.isEnabled) {
            return Promise.resolve(false);
        }

        // Evita ejecutar varias comprobaciones simultáneamente.
        if (this.comprobacionActual) {
            return this.comprobacionActual;
        }

        const comprobacion = this.swUpdate.checkForUpdate()
            .catch(error => {
                console.error(
                    'WorkStock PWA: error verificando actualizaciones:',
                    error
                );

                if (manual) {
                    this.mostrarMensaje(
                        'No fue posible verificar las actualizaciones. Revisa tu conexión.'
                    );
                }

                throw error;
            })
            .finally(() => {
                this.comprobacionActual = null;
            });

        this.comprobacionActual = comprobacion;

        // Las comprobaciones automáticas no deben producir
        // rechazos de Promise sin gestionar.
        if (!manual) {
            return comprobacion.catch(() => false);
        }

        return comprobacion;
    }

    /* ===================================================
       MOSTRAR DIÁLOGO DE ACTUALIZACIÓN
    =================================================== */
    private mostrarAviso(): void {
        if (this.avisoAbierto || this.pospuesto) return;

        this.avisoAbierto = true;

        const ref = this.dialog.open(PwaUpdateDialog, {
            width: '420px',
            maxWidth: '95vw',
            disableClose: true,
            autoFocus: false,
            panelClass: 'workstock-pwa-update'
        });

        ref.afterClosed().subscribe((actualizar: boolean) => {
            this.avisoAbierto = false;

            if (actualizar) {
                try {
                    sessionStorage.setItem(this.claveRecarga, '1');
                } catch {
                    // Continuar aunque no sea posible guardar el indicador.
                }

                // Se recarga toda la aplicación para evitar mezclar
                // archivos JavaScript de compilaciones distintas.
                window.location.reload();
            } else {
                this.pospuesto = true;
            }
        });
    }

    /* ===================================================
       NOTIFICACIONES
    =================================================== */
    private mostrarMensaje(mensaje: string): void {
        this.snackBar.open(mensaje, 'Cerrar', {
            duration: 5500,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
        });
    }
}
