
import {
    computed,
    Injectable,
    OnDestroy,
    signal
} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LoadingService implements OnDestroy {

    // ============================================
    // CONFIGURACIÓN
    // ============================================

    private readonly retrasoMs = 300;

    // ============================================
    // PETICIONES ACTIVAS
    // ============================================

    private readonly peticionesActivas =
        signal(0);

    // ============================================
    // ESTADO VISIBLE DEL INDICADOR
    // ============================================

    private readonly visibleInterno =
        signal(false);

    readonly visible = this.visibleInterno.asReadonly();

    readonly cargando = computed(
        () => this.peticionesActivas() > 0
    );

    // ============================================
    // TEMPORIZADOR
    // ============================================

    private temporizador:
        ReturnType<typeof setTimeout> | null = null;

    // ============================================
    // INICIAR SOLICITUD
    // ============================================

    iniciar(): void {

        this.peticionesActivas.update(
            total => total + 1
        );

        if (
            this.visibleInterno() ||
            this.temporizador !== null
        ) {
            return;
        }

        this.temporizador = setTimeout(() => {

            this.temporizador = null;

            if (this.peticionesActivas() > 0) {
                this.visibleInterno.set(true);
            }

        }, this.retrasoMs);

    }

    // ============================================
    // FINALIZAR SOLICITUD
    // ============================================

    finalizar(): void {

        this.peticionesActivas.update(
            total => Math.max(0, total - 1)
        );

        if (this.peticionesActivas() > 0) {
            return;
        }

        this.cancelarTemporizador();

        this.visibleInterno.set(false);

    }

    // ============================================
    // CANCELAR TEMPORIZADOR
    // ============================================

    private cancelarTemporizador(): void {

        if (this.temporizador !== null) {

            clearTimeout(this.temporizador);

            this.temporizador = null;

        }

    }

    // ============================================
    // LIBERAR RECURSOS
    // ============================================

    ngOnDestroy(): void {

        this.cancelarTemporizador();

        this.peticionesActivas.set(0);

        this.visibleInterno.set(false);

    }

}
