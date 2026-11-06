
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { SesionActividadService } from './core/services/sesion-actividad.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private pwaUpdate = inject(PwaUpdateService);
  private sesionActividad = inject(SesionActividadService);

  ngOnInit(): void {
    this.pwaUpdate.iniciar();
    this.sesionActividad.iniciar();
  }
}
