
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrdenesTrabajoService, SeguimientoOrdenPublica } from '../ordenes-trabajo.service';

@Component({
    selector: 'app-seguimiento-orden-publica',
    standalone: true,
    imports: [DatePipe, MatIconModule, MatButtonModule],
    templateUrl: './seguimiento-orden-publica.html',
    styleUrl: './seguimiento-orden-publica.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeguimientoOrdenPublicaComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly service = inject(OrdenesTrabajoService);
    private readonly destroyRef = inject(DestroyRef);

    readonly cargando = signal(false);
    readonly error = signal('');
    readonly orden = signal<SeguimientoOrdenPublica | null>(null);
    readonly ultimaConsulta = signal<Date | null>(null);
    readonly errorLogo = signal(false);

    readonly estadoActual = computed(() =>
        String(this.orden()?.estado ?? '').trim().toUpperCase()
    );

    readonly iconoEstado = computed(() => {
        switch (this.estadoActual()) {
            case 'EN DIAGNÓSTICO': return 'troubleshoot';
            case 'ESPERANDO REPUESTO': return 'hourglass_top';
            case 'REPARADO': return 'build_circle';
            case 'SIN REPARACIÓN': return 'report_problem';
            default: return 'assignment';
        }
    });

    readonly descripcionEstado = computed(() => {
        switch (this.estadoActual()) {
            case 'EN DIAGNÓSTICO': return 'Tu equipo se encuentra en revisión y diagnóstico.';
            case 'ESPERANDO REPUESTO': return 'Estamos esperando un repuesto para continuar.';
            case 'REPARADO': return 'La reparación de tu equipo ha sido completada.';
            case 'SIN REPARACIÓN': return 'Tu equipo no ha podido ser reparado.';
            default: return 'Consulta el estado actualizado de tu orden.';
        }
    });

    readonly logoUrl = computed(() => {
        const ruta = this.orden()?.logoEmpresaUrl;
        if (!ruta) return null;
        // Solo permitimos la ruta de imágenes pública de WorkStock.
        if (!/^\/api\/ordenes-trabajo\/seguimiento-publico\/[a-f0-9]{64}\/logo$/.test(ruta)) {
            return null;
        }
        return ruta;
    });

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            this.consultar(params.get('token') ?? '');
        });
    }

    actualizar(): void {
        this.consultar(this.route.snapshot.paramMap.get('token') ?? '');
    }

    falloLogo(): void {
        this.errorLogo.set(true);
    }

    private consultar(token: string): void {
        if (this.cargando()) return;
        this.error.set('');
        if (!/^[a-f0-9]{64}$/.test(token)) {
            this.orden.set(null);
            this.error.set('El enlace de seguimiento no es válido.');
            return;
        }
        this.cargando.set(true);
        this.service.consultarSeguimientoPublico(token).pipe(
            finalize(() => this.cargando.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: respuesta => {
                if (!respuesta.success || !respuesta.data) {
                    this.orden.set(null);
                    this.error.set('No fue posible consultar la orden.');
                    return;
                }
                this.orden.set(respuesta.data);
                this.errorLogo.set(false);
                this.ultimaConsulta.set(new Date());
            },
            error: (err: HttpErrorResponse) => {
                this.orden.set(null);
                this.error.set(err.status === 404 || err.status === 403
                    ? 'El seguimiento ya no está disponible. La orden puede estar cerrada o entregada.'
                    : 'No fue posible consultar la orden. Intenta nuevamente.');
            }
        });
    }
}
