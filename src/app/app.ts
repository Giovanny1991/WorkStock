
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private pwaUpdate = inject(PwaUpdateService);

  ngOnInit(): void {
    this.pwaUpdate.iniciar();
  }
}
