import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    computed,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import {
    SeguridadDispositivo,
    TipoBloqueoDispositivo
} from '../orden-trabajo.model';

@Component({
    selector: 'app-orden-trabajo-seguridad',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatRadioModule
    ],
    templateUrl: './orden-trabajo-seguridad.html',
    styleUrl: './orden-trabajo-seguridad.scss'
})
export class OrdenTrabajoSeguridadComponent {

    // =====================================================
    // REFERENCIAS Y EVENTOS
    // =====================================================
    @ViewChild('lienzo')
    lienzo?: ElementRef<SVGSVGElement>;

    @Output()
    seguridadChange = new EventEmitter<SeguridadDispositivo>();

    // =====================================================
    // FORMULARIO
    // =====================================================
    readonly tipo = new FormControl<TipoBloqueoDispositivo>(
        'SIN_BLOQUEO',
        { nonNullable: true }
    );

    readonly clave = new FormControl<string>(
        '',
        { nonNullable: true }
    );

    readonly mostrarClave = signal(false);
    readonly tipoActual = signal<TipoBloqueoDispositivo>('SIN_BLOQUEO');

    // =====================================================
    // PATRÓN
    // =====================================================
    readonly puntos = signal<number[]>([]);
    readonly dibujando = signal(false);
    readonly posicion = signal<{ x: number; y: number } | null>(null);

    readonly nodos = Array.from({ length: 9 }, (_, i) => ({
        numero: i + 1,
        x: 40 + (i % 3) * 70,
        y: 40 + Math.floor(i / 3) * 70
    }));

    // =====================================================
    // ESTADO INTERNO
    // =====================================================
    private _soloLectura = false;
    private _valorInicial: SeguridadDispositivo | null = null;

    // La credencial consultada se mantiene separada
    // de los datos que están siendo editados.
    readonly guardada = signal<SeguridadDispositivo | null>(null);

    readonly consultandoVisual = computed(() => false);

    readonly puntosGuardados = computed(() =>
        this.convertirPatron(this.guardada()?.patronDispositivo)
    );

    readonly puntosVisibles = computed(() =>
        this.puntos()
    );

    readonly tipoVisible = computed<TipoBloqueoDispositivo>(() =>
        this.tipoActual()
    );

    // =====================================================
    // SOLO LECTURA
    // =====================================================
    @Input()
    set soloLectura(valor: boolean) {
        this._soloLectura = valor === true;
        this.actualizarEstadoControles();
    }

    get soloLectura(): boolean {
        return this._soloLectura;
    }

    private actualizarEstadoControles(): void {
        if (this._soloLectura) {
            this.tipo.disable({ emitEvent: false });
            this.clave.disable({ emitEvent: false });
        } else {
            this.tipo.enable({ emitEvent: false });
            this.clave.enable({ emitEvent: false });
        }
    }

    // =====================================================
    // DATOS INICIALES DE LA ORDEN
    // =====================================================
    @Input()
    set valorInicial(valor: SeguridadDispositivo | null) {
        if (!valor) return;

        this._valorInicial = valor;

        const tipo = this.normalizarTipo(
            valor.tipoBloqueo,
            'NO_REGISTRADO'
        );

        this.tipo.setValue(tipo, { emitEvent: false });
        this.tipoActual.set(tipo);

        this.clave.setValue(
            valor.claveDispositivo ?? '',
            { emitEvent: false }
        );

        this.puntos.set(
            this.convertirPatron(valor.patronDispositivo)
        );

        this.guardada.set(null);
        this.mostrarClave.set(false);
        this.dibujando.set(false);
        this.posicion.set(null);

        this.actualizarEstadoControles();
    }

    // =====================================================
    // CREDENCIAL CONSULTADA EN EL BACKEND
    // =====================================================
    @Input()
    set credencialConsultada(valor: SeguridadDispositivo | null) {
        if (!valor) {
            this.guardada.set(null);
            this.mostrarClave.set(false);
            return;
        }

        const tipo = this.normalizarTipo(
            valor.tipoBloqueo,
            'NO_REGISTRADO'
        );

        this.guardada.set({
            tipoBloqueo: tipo,
            claveDispositivo:
                tipo === 'CONTRASENA'
                    ? valor.claveDispositivo ?? null
                    : null,
            patronDispositivo:
                tipo === 'PATRON'
                    ? valor.patronDispositivo ?? null
                    : null
        });

        // La credencial recuperada se muestra en los mismos controles editables.
        this.tipo.setValue(tipo, { emitEvent: false });
        this.tipoActual.set(tipo);
        this.clave.setValue(tipo === 'CONTRASENA' ? (valor.claveDispositivo ?? '') : '', { emitEvent: false });
        this.puntos.set(tipo === 'PATRON' ? this.convertirPatron(valor.patronDispositivo) : []);
        this.mostrarClave.set(true);
        this.dibujando.set(false);
        this.posicion.set(null);
    }

    // =====================================================
    // NORMALIZAR TIPO DE BLOQUEO
    // =====================================================
    private normalizarTipo(
        valor: unknown,
        predeterminado: TipoBloqueoDispositivo = 'SIN_BLOQUEO'
    ): TipoBloqueoDispositivo {
        const tipo = String(valor ?? '')
            .trim()
            .toUpperCase();

        if (
            tipo === 'SIN_BLOQUEO' ||
            tipo === 'CONTRASENA' ||
            tipo === 'PATRON' ||
            tipo === 'NO_REGISTRADO'
        ) {
            return tipo;
        }

        return predeterminado;
    }

    // =====================================================
    // CAMBIAR MÉTODO DE BLOQUEO
    // =====================================================
    cambiarTipo(valor: TipoBloqueoDispositivo): void {
        if (this.soloLectura || this.consultandoVisual()) return;

        const tipo = this.normalizarTipo(valor);

        if (tipo === 'NO_REGISTRADO') {
            return;
        }

        const anterior = this.tipoActual();

        if (tipo !== anterior) {
            this.tipo.setValue(tipo, { emitEvent: false });
            this.tipoActual.set(tipo);

            this.clave.setValue('', { emitEvent: false });
            this.puntos.set([]);

            this.posicion.set(null);
            this.dibujando.set(false);
            this.mostrarClave.set(false);

            this.emitir();
        }
    }

    // =====================================================
    // CAMBIO DE CONTRASEÑA
    // =====================================================
    cambiarClave(): void {
        if (this.soloLectura || this.consultandoVisual()) return;
        this.emitir();
    }

    // =====================================================
    // LIMPIAR PATRÓN
    // =====================================================
    limpiarPatron(): void {
        if (this.soloLectura || this.consultandoVisual()) return;

        this.puntos.set([]);
        this.dibujando.set(false);
        this.posicion.set(null);

        this.emitir();
    }

    // =====================================================
    // CONVERTIR SECUENCIA GUARDADA
    // EJEMPLO: 1-2-3-6-9
    // =====================================================
    private convertirPatron(valor?: string | null): number[] {
        if (!valor || typeof valor !== 'string') return [];

        const partes = valor.split('-');
        const numeros = partes.map(Number);

        if (
            numeros.length < 4 ||
            numeros.length > 9 ||
            partes.some(p => !/^[1-9]$/.test(p)) ||
            new Set(numeros).size !== numeros.length
        ) {
            return [];
        }

        return numeros;
    }

    // =====================================================
    // COORDENADAS SVG
    // =====================================================
    private coordenadas(
        event: PointerEvent
    ): { x: number; y: number } | null {
        const svg = this.lienzo?.nativeElement;

        if (!svg) return null;

        const rect = svg.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
            return null;
        }

        return {
            x: (event.clientX - rect.left) * 220 / rect.width,
            y: (event.clientY - rect.top) * 220 / rect.height
        };
    }

    // =====================================================
    // IDENTIFICAR PUNTO DEL PATRÓN
    // =====================================================
    private puntoDesdeEvento(event: PointerEvent): number | null {
        const posicion = this.coordenadas(event);

        if (!posicion) return null;

        const nodo = this.nodos.find(
            item =>
                Math.hypot(
                    item.x - posicion.x,
                    item.y - posicion.y
                ) <= 26
        );

        return nodo?.numero ?? null;
    }

    // =====================================================
    // INICIAR DIBUJO DEL PATRÓN
    // =====================================================
    iniciarPatron(event: PointerEvent): void {
        if (
            this.soloLectura ||
            this.consultandoVisual() ||
            this.tipoActual() !== 'PATRON'
        ) {
            return;
        }

        event.preventDefault();

        const primerPunto = this.puntoDesdeEvento(event);

        // No comenzar si no se seleccionó un nodo.
        if (!primerPunto) return;

        this.puntos.set([]);
        this.posicion.set(null);
        this.dibujando.set(true);

        const svg = this.lienzo?.nativeElement;

        if (svg) {
            svg.setPointerCapture(event.pointerId);
        }

        this.agregarPunto(primerPunto);
        this.posicion.set(this.coordenadas(event));
    }

    // =====================================================
    // MOVER DEDO O CURSOR
    // =====================================================
    moverPatron(event: PointerEvent): void {
        if (
            !this.dibujando() ||
            this.soloLectura ||
            this.consultandoVisual()
        ) {
            return;
        }

        event.preventDefault();

        this.posicion.set(
            this.coordenadas(event)
        );

        const punto = this.puntoDesdeEvento(event);

        this.agregarPunto(punto);
    }

    // =====================================================
    // FINALIZAR DIBUJO
    // =====================================================
    terminarPatron(event: PointerEvent): void {
        if (!this.dibujando()) return;

        this.agregarPunto(
            this.puntoDesdeEvento(event)
        );

        this.dibujando.set(false);
        this.posicion.set(null);

        const svg = this.lienzo?.nativeElement;

        if (svg?.hasPointerCapture(event.pointerId)) {
            svg.releasePointerCapture(event.pointerId);
        }

        this.emitir();
    }

    // =====================================================
    // AGREGAR PUNTO
    // INCLUYE PUNTOS INTERMEDIOS
    // =====================================================
    private agregarPunto(numero: number | null): void {
        if (
            numero === null ||
            numero < 1 ||
            numero > 9 ||
            this.puntos().includes(numero)
        ) {
            return;
        }

        const actuales = [...this.puntos()];
        const anterior = actuales.at(-1);

        if (anterior !== undefined) {
            const origen = this.nodos[anterior - 1];
            const destino = this.nodos[numero - 1];

            const diferenciaX = (destino.x - origen.x) / 70;
            const diferenciaY = (destino.y - origen.y) / 70;

            const pasos = this.mcd(
                Math.abs(diferenciaX),
                Math.abs(diferenciaY)
            );

            if (pasos > 1) {
                for (let i = 1; i < pasos; i++) {
                    const x = origen.x +
                        (destino.x - origen.x) * i / pasos;

                    const y = origen.y +
                        (destino.y - origen.y) * i / pasos;

                    const intermedio = this.nodos.find(
                        nodo => nodo.x === x && nodo.y === y
                    );

                    if (
                        intermedio &&
                        !actuales.includes(intermedio.numero)
                    ) {
                        actuales.push(intermedio.numero);
                    }
                }
            }
        }

        actuales.push(numero);

        this.puntos.set(actuales);
    }

    // =====================================================
    // MÁXIMO COMÚN DIVISOR
    // =====================================================
    private mcd(a: number, b: number): number {
        while (b !== 0) {
            [a, b] = [b, a % b];
        }

        return a || 1;
    }

    // =====================================================
    // COORDENADAS DE CADA NODO
    // =====================================================
    puntoX(numero: number): number {
        return this.nodos[numero - 1]?.x ?? 0;
    }

    puntoY(numero: number): number {
        return this.nodos[numero - 1]?.y ?? 0;
    }

    // =====================================================
    // SECUENCIA DEL PATRÓN
    // =====================================================
    secuencia(): string {
        return this.puntos().join('-');
    }

    // =====================================================
    // DATOS PARA EL BACKEND
    // NUNCA ENVÍA LA CREDENCIAL CONSULTADA
    // =====================================================
    obtenerValor(): SeguridadDispositivo {
        const tipoBloqueo = this.tipoActual();

        if (tipoBloqueo === 'CONTRASENA') {
            return {
                tipoBloqueo,
                claveDispositivo: this.clave.value || null,
                patronDispositivo: null
            };
        }

        if (tipoBloqueo === 'PATRON') {
            return {
                tipoBloqueo,
                claveDispositivo: null,
                patronDispositivo: this.secuencia() || null
            };
        }

        return {
            tipoBloqueo,
            claveDispositivo: null,
            patronDispositivo: null
        };
    }

    // =====================================================
    // VALIDACIÓN
    // =====================================================
    validar(): string | null {
        const valor = this.obtenerValor();

        if (valor.tipoBloqueo === 'NO_REGISTRADO') {
            // Mantener compatibilidad con órdenes anteriores.
            if (this._valorInicial?.tipoBloqueo === 'NO_REGISTRADO') {
                return null;
            }

            return 'Selecciona un método de desbloqueo válido.';
        }

        if (valor.tipoBloqueo === 'SIN_BLOQUEO') {
            return null;
        }

        if (valor.tipoBloqueo === 'CONTRASENA') {
            const clave = valor.claveDispositivo;

            if (!clave || !clave.trim()) {
                // Si no se cambió el método, conservar la clave anterior.
                if (this._valorInicial?.tipoBloqueo === 'CONTRASENA') {
                    return null;
                }

                return 'Ingresa la contraseña o PIN del dispositivo.';
            }

            if (clave.length > 100) {
                return 'La contraseña no puede superar los 100 caracteres.';
            }

            return null;
        }

        if (valor.tipoBloqueo === 'PATRON') {
            const longitud = this.puntos().length;

            if (longitud < 4) {
                // Si no se cambió el método, conservar el patrón anterior.
                if (
                    this._valorInicial?.tipoBloqueo === 'PATRON' &&
                    longitud === 0
                ) {
                    return null;
                }

                return 'El patrón debe contener al menos cuatro puntos diferentes.';
            }

            if (longitud > 9) {
                return 'El patrón no puede superar nueve puntos.';
            }

            return null;
        }

        return 'Tipo de bloqueo no válido.';
    }

    // =====================================================
    // REINICIAR NUEVA ORDEN
    // =====================================================
    reiniciar(): void {
        this._valorInicial = null;
        this.guardada.set(null);

        this.tipo.setValue(
            'SIN_BLOQUEO',
            { emitEvent: false }
        );

        this.tipoActual.set('SIN_BLOQUEO');

        this.clave.setValue(
            '',
            { emitEvent: false }
        );

        this.puntos.set([]);
        this.posicion.set(null);
        this.dibujando.set(false);
        this.mostrarClave.set(false);

        this.actualizarEstadoControles();
        this.emitir();
    }

    // =====================================================
    // NOTIFICAR CAMBIOS AL COMPONENTE PADRE
    // =====================================================
    private emitir(): void {
        this.seguridadChange.emit(
            this.obtenerValor()
        );
    }
}