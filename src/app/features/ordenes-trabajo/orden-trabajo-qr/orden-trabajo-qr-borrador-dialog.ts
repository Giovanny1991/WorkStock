import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import * as QRCode from 'qrcode';
import { enlaceCargaQr } from './qr-enlace';
import { NotificationService } from '../../../core/services/notification';
import { SesionBorradorQr } from './orden-trabajo-qr-borrador.service';
@Component({selector:'app-orden-trabajo-qr-borrador-dialog',standalone:true,
  imports:[MatDialogModule,MatButtonModule,MatIconModule],
  templateUrl:'./orden-trabajo-qr-borrador-dialog.html',styleUrl:'./orden-trabajo-qr-borrador-dialog.scss'})
export class OrdenTrabajoQrBorradorDialog {
  private readonly ref=inject(MatDialogRef<OrdenTrabajoQrBorradorDialog>);
  private readonly notify=inject(NotificationService);
  readonly sesion=inject<SesionBorradorQr>(MAT_DIALOG_DATA);
  readonly codigoQr=signal<string | null>(null);
  readonly error=signal('');
  readonly enlace=enlaceCargaQr('borrador', this.sesion.token);
  constructor(){
    void QRCode.toDataURL(this.enlace,{width:280,margin:2,errorCorrectionLevel:'M',color:{dark:'#142b47',light:'#ffffff'}})
      .then(valor=>this.codigoQr.set(valor)).catch(()=>this.error.set('No se pudo mostrar el QR. Usa el enlace.'));
  }
  copiar():void { void navigator.clipboard.writeText(this.enlace).then(()=>this.notify.success('Enlace copiado')).catch(()=>this.notify.warning('No se pudo copiar el enlace.')); }
  cerrar():void { this.ref.close(); }
}
