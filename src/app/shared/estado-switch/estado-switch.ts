import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'app-estado-switch',
  standalone: true,
  imports: [MatTooltipModule],
  templateUrl: './estado-switch.html',
  styleUrl: './estado-switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstadoSwitch {
  @Input() activo = false;
  @Input() deshabilitado = false;
  @Input() nombre = 'registro';
  @Output() cambiar = new EventEmitter<void>();
}
