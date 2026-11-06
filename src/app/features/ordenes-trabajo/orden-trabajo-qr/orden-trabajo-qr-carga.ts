import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ConsultaQrOrden, OrdenTrabajoQrService } from './orden-trabajo-qr.service';

interface FotoPendienteQr { archivo: File; url: string; }
@Component({ selector:'app-orden-trabajo-qr-carga', standalone:true,
  imports:[MatIconModule,MatButtonModule,MatProgressBarModule],
  templateUrl:'./orden-trabajo-qr-carga.html', styleUrl:'./orden-trabajo-qr-carga.scss' })
export class OrdenTrabajoQrCarga implements OnInit, OnDestroy {
  private readonly route=inject(ActivatedRoute);
  private readonly service=inject(OrdenTrabajoQrService);
  private readonly destroyRef=inject(DestroyRef);
  readonly consultando=signal(false);
  readonly subiendo=signal(false);
  readonly eliminando=signal<number|null>(null);
  readonly sesion=signal<ConsultaQrOrden | null>(null);
  readonly error=signal('');
  readonly mensaje=signal('');
  readonly pendientes=signal<FotoPendienteQr[]>([]);
  private token='';
  ngOnInit():void {
    this.token=this.route.snapshot.paramMap.get('token')??'';
    if(!/^[a-f0-9]{64}$/.test(this.token)){ this.error.set('Código QR inválido.'); return; }
    this.consultar();
  }
  ngOnDestroy():void { this.limpiarPendientes(); }
  consultar():void {
    if(this.consultando()||this.subiendo()||!this.token)return;
    this.consultando.set(true);this.error.set('');
    this.service.consultar(this.token).pipe(finalize(()=>this.consultando.set(false)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next:r=>this.sesion.set(r.data),
      error:(e:HttpErrorResponse)=>{this.sesion.set(null);this.error.set(this.mensajeError(e,'QR vencido o sin autorización.'));}
    });
  }
  seleccionar(event:Event):void {
    const input=event.target as HTMLInputElement;
    const archivos=Array.from(input.files??[]);input.value='';
    const sesion=this.sesion();
    if(!archivos.length||this.subiendo()||!sesion)return;
    const existentes=this.pendientes();
    if(existentes.length+archivos.length>5){this.error.set('Puedes enviar hasta 5 fotografías por solicitud.');return;}
    if(archivos.some(f=>f.size<1||f.size>2097152||!['image/jpeg','image/png','image/webp'].includes(f.type))){
      this.error.set('Solo fotografías JPG, PNG o WEBP de máximo 2 MB. Verifica el formato de la cámara.');return;
    }
    if(existentes.length+archivos.length>sesion.MaxFotografias-sesion.FotografiasCargadas){this.error.set('No hay cupo para esa cantidad de fotografías.');return;}
    const nuevas=archivos.map(archivo=>({archivo,url:URL.createObjectURL(archivo)}));
    this.pendientes.set([...existentes,...nuevas]);this.error.set('');this.mensaje.set('');
  }
  quitar(index:number):void {
    if(this.subiendo())return;
    const actuales=this.pendientes();const item=actuales[index];if(!item)return;
    URL.revokeObjectURL(item.url);
    this.pendientes.set(actuales.filter((_,i)=>i!==index));
  }
  eliminarEnviada(idFoto:number,nombre:string):void {
    if(this.eliminando()!==null||this.subiendo()||!this.sesion())return;
    if(!window.confirm(`¿Eliminar la fotografía enviada "${nombre}"?`))return;
    this.eliminando.set(idFoto);this.error.set('');this.mensaje.set('');
    this.service.eliminarEnviada(this.token,idFoto).pipe(finalize(()=>this.eliminando.set(null)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next:()=>{this.mensaje.set('Fotografía eliminada.');this.actualizarSesion();},
      error:(e:HttpErrorResponse)=>this.error.set(this.mensajeError(e,'No se pudo eliminar la fotografía.'))
    });
  }
  enviar():void {
    const pendientes=this.pendientes();const sesion=this.sesion();
    if(!sesion||this.subiendo()||!pendientes.length)return;
    if(pendientes.length>sesion.MaxFotografias-sesion.FotografiasCargadas){this.error.set('El cupo disponible cambió. Actualiza y revisa la selección.');return;}
    this.subiendo.set(true);this.error.set('');this.mensaje.set('');
    this.service.subir(this.token,pendientes.map(p=>p.archivo)).pipe(finalize(()=>this.subiendo.set(false)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next:()=>{this.limpiarPendientes();this.mensaje.set('Fotografías enviadas correctamente.');this.actualizarSesion();},
      error:(e:HttpErrorResponse)=>{this.error.set(this.mensajeError(e,'No se pudieron enviar las fotografías.'));this.actualizarSesion();}
    });
  }
  private actualizarSesion():void {
    this.service.consultar(this.token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:r=>this.sesion.set(r.data),
      error:()=>this.sesion.set(null)
    });
  }
  private limpiarPendientes():void {
    for(const item of this.pendientes())URL.revokeObjectURL(item.url);
    this.pendientes.set([]);
  }
  private mensajeError(e:HttpErrorResponse,alternativo:string):string {return e.error?.message??alternativo;}
}
