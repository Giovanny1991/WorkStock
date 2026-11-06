import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Cliente } from '../cliente.model';
import { AYUDA_IDENTIFICACION_CLIENTE } from '../cliente-identificacion';

@Component({
  selector: 'app-cliente-seleccionado',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './cliente-seleccionado.html',
  styleUrl: './cliente-seleccionado.scss'
})
export class ClienteSeleccionadoComponent {
  readonly cliente = input<Cliente | null>(null);
  readonly ayudaIdentificacion = AYUDA_IDENTIFICACION_CLIENTE;
}
