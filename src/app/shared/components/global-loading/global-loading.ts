
import {
    Component,
    inject
} from '@angular/core';

import {
    MatProgressSpinnerModule
} from '@angular/material/progress-spinner';

import {
    LoadingService
} from '../../../core/services/loading.service';


@Component({

    selector: 'app-global-loading',

    standalone: true,

    imports: [
        MatProgressSpinnerModule
    ],

    templateUrl: './global-loading.html',

    styleUrl: './global-loading.scss'

})
export class GlobalLoading {

    readonly loadingService = inject(
        LoadingService
    );

}
