import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../../core/services/notification';
import { OrdenesTrabajoNotificacionesService } from './ordenes-trabajo-notificaciones.service';
import {
    EstadoNotificacion,
    ESTADOS_NOTIFICACION,
    VARIABLES_MENSAJE,
    OrdenEstadoConfiguracion
} from './ordenes-trabajo-notificaciones.model';

@Component({
    selector: 'app-ordenes-trabajo-notificaciones',
    standalone: true,
    imports: [
        DatePipe, ReactiveFormsModule, MatButtonModule,
        MatCheckboxModule, MatFormFieldModule, MatIconModule,
        MatInputModule, MatProgressBarModule, MatTooltipModule
    ],
    templateUrl: './ordenes-trabajo-notificaciones.html',
    styleUrl: './ordenes-trabajo-notificaciones.scss'
})
export class OrdenesTrabajoNotificaciones implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly service = inject(OrdenesTrabajoNotificacionesService);
    private readonly notify = inject(NotificationService);

    readonly estados = ESTADOS_NOTIFICACION;
    readonly variables = VARIABLES_MENSAJE;
    readonly configuraciones = signal<OrdenEstadoConfiguracion[]>([]);
    readonly seleccionado = signal<EstadoNotificacion>('EN DIAGNÓSTICO');
    readonly cargando = signal(false);
    readonly guardando = signal(false);
    readonly cargado = signal(false);
    readonly modificado = signal(false);
    readonly mostrarVistaPrevia = signal(true);

    readonly notificarCliente = new FormControl(false, { nonNullable: true });
    readonly mensajeCliente = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(2000)]
    });

    readonly configuracionActual = computed(() =>
        this.configuraciones().find(x => x.estado === this.seleccionado()) ?? null
    );

    readonly totalActivos = computed(() =>
        this.configuraciones().filter(x => x.activo && x.notificarCliente).length
    );

    readonly vistaPrevia = signal('');
    readonly longitudMensaje = signal(0);

    ngOnInit(): void {
        this.configurarFormulario();
        this.cargar();
    }

    private configurarFormulario(): void {
        this.mensajeCliente.valueChanges.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(mensaje => {
            this.actualizarVistaPrevia();
            this.actualizarModificado();
        });

        this.notificarCliente.valueChanges.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => this.actualizarModificado());
    }

    cargar(): void {
        if (this.cargando() || this.guardando()) return;
        this.cargando.set(true);
        this.service.listar().pipe(
            finalize(() => this.cargando.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: response => {
                this.configuraciones.set(response.data ?? []);
                this.cargado.set(true);
                this.cargarSeleccionado();
            },
            error: error => {
                this.cargado.set(false);
                this.notify.error(
                    error?.error?.message ?? 'No fue posible cargar las configuraciones de notificación'
                );
            }
        });
    }

    private cargarSeleccionado(): void {
        const config = this.configuracionActual();
        this.notificarCliente.setValue(Boolean(config?.notificarCliente), { emitEvent: false });
        this.mensajeCliente.setValue(config?.mensajeCliente ?? '', { emitEvent: false });
        this.mensajeCliente.markAsPristine();
        this.mensajeCliente.markAsUntouched();
        this.notificarCliente.markAsPristine();
        this.modificado.set(false);
        this.actualizarVistaPrevia();
    }

    seleccionarEstado(estado: EstadoNotificacion): void {
        if (this.guardando() || this.cargando() || estado === this.seleccionado()) return;
        if (this.modificado()) {
            const continuar = window.confirm(
                'Existen cambios sin guardar. ¿Deseas descartarlos y cambiar de estado?'
            );
            if (!continuar) return;
        }
        this.seleccionado.set(estado);
        this.cargarSeleccionado();
    }

    private actualizarModificado(): void {
        const original = this.configuracionActual();
        if (!original) {
            this.modificado.set(false);
            return;
        }
        this.modificado.set(
            original.mensajeCliente !== this.mensajeCliente.value ||
            Boolean(original.notificarCliente) !== this.notificarCliente.value
        );
    }

    private reemplazarVariables(mensaje: string): string {
        const datos: Record<string, string> = {
            CLIENTE: 'Juan Pérez',
            ORDEN: '000000125',
            EQUIPO: 'Samsung A55',
            IMEI: '123456789012345',
            ESTADO: this.seleccionado(),
            TOTAL: '$85.00',
            SALDO: '$0.00',
            EMPRESA: 'Mi empresa'
        };
        return mensaje.replace(
            /\{(CLIENTE|ORDEN|EQUIPO|IMEI|ESTADO|TOTAL|SALDO|EMPRESA)\}/g,
            (_coincidencia, variable: string) => datos[variable] ?? ''
        );
    }

    private actualizarVistaPrevia(): void {
        const mensaje = this.mensajeCliente.value;
        this.longitudMensaje.set(mensaje.length);
        this.vistaPrevia.set(this.reemplazarVariables(mensaje));
    }

    insertarVariable(variable: string): void {
        if (this.guardando()) return;
        const actual = this.mensajeCliente.value;
        const separador = actual && !/\s$/.test(actual) ? ' ' : '';
        this.mensajeCliente.setValue(actual + separador + variable);
        this.mensajeCliente.markAsTouched();
    }

    alternarVistaPrevia(): void {
        this.mostrarVistaPrevia.update(valor => !valor);
    }

    restablecer(): void {
        this.cargarSeleccionado();
        this.notify.success('Se restablecieron los valores guardados');
    }


    private validarVariables(mensaje: string): boolean {
        const permitidas = new Set<string>(
            this.variables.map(item => item.variable)
        );
        const encontradas = mensaje.match(/\{[^{}]+\}/g) ?? [];
        const invalidas = encontradas.filter(variable => !permitidas.has(variable));
        const restante = mensaje.replace(/\{[^{}]+\}/g, '');
        if (invalidas.length > 0 || restante.includes('{') || restante.includes('}')) {
            this.notify.warning('El mensaje contiene variables no permitidas o incorrectas');
            return false;
        }
        return true;
    }


    guardar(): void {
        if (this.cargando() || this.guardando() || !this.configuracionActual()) return;
        this.mensajeCliente.markAsTouched();

        if (this.mensajeCliente.invalid) {
            this.notify.warning('El mensaje debe contener entre 1 y 2000 caracteres');
            return;
        }

        const mensaje = this.mensajeCliente.value.trim();
        if (!mensaje || !this.validarVariables(mensaje)) return;

        this.guardando.set(true);
        this.service.actualizar({
            estado: this.seleccionado(),
            notificarCliente: this.notificarCliente.value,
            mensajeCliente: mensaje
        }).pipe(
            finalize(() => this.guardando.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: response => {
                this.configuraciones.update(items =>
                    items.map(item => item.estado === response.data.estado ? response.data : item)
                );
                this.cargarSeleccionado();
                this.notify.success(
                    response.message ?? 'Configuración guardada correctamente'
                );
            },
            error: error => this.notify.error(
                error?.error?.message ?? 'No fue posible guardar la configuración'
            )
        });
    }
}