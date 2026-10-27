
import {
    HttpInterceptorFn
} from '@angular/common/http';

export const apiUrlInterceptor: HttpInterceptorFn = (
    req,
    next
) => {

    // URL pública de la API.
    // La ruta final debe coincidir con los endpoints
    // que expone IIS.
    // LINUX CAMBIAR EN EL PROXY
   const API_BASE_URL ='https://myc.innovaservgroup.com/WorkStockApi';
   // const API_BASE_URL ='http://localhost:3000';

    // Durante el desarrollo seguimos usando
    // el proxy configurado en Angular.
    const isProduction = !(
        typeof window !== 'undefined' &&
        (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        ) &&
        window.location.port !== ''
    );

    if (!isProduction) {
        return next(req);
    }

    // Solo modificar peticiones relativas /api.
    if (
        req.url !== '/api' &&
        !req.url.startsWith('/api/')
    ) {
        return next(req);
    }

    const request = req.clone({
        url: `${API_BASE_URL}${req.url}`
    });

    return next(request);
};
