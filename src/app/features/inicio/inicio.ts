import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';


@Component({
  selector: 'app-inicio',
  standalone: true,

  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {

  readonly authService =
    inject(AuthService);

}