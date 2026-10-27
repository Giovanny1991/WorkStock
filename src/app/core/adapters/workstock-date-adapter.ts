import { Injectable } from '@angular/core';

import {
    MatDateFormats,
    NativeDateAdapter
} from '@angular/material/core';

// =====================================================
// FORMATOS DE FECHA WORKSTOCK
// =====================================================

export const WORKSTOCK_DATE_FORMATS: MatDateFormats = {

    parse: {
        dateInput: 'DD/MM/YYYY'
    },

    display: {

        dateInput: 'DD/MM/YYYY',

        monthYearLabel: {
            month: 'short',
            year: 'numeric'
        },

        dateA11yLabel: {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        },

        monthYearA11yLabel: {
            month: 'long',
            year: 'numeric'
        }
    }
};


// =====================================================
// ADAPTADOR DE FECHAS
// DD/MM/YYYY
// =====================================================

@Injectable()
export class WorkStockDateAdapter extends NativeDateAdapter {

    // =================================================
    // PARSEAR FECHA ESCRITA
    // Ejemplo:
    // 23/10/2026
    // =================================================

    override parse(
        value: any
    ): Date | null {

        if (value === null || value === undefined || value === '') {
            return null;
        }

        // Si ya recibimos un Date
        if (value instanceof Date) {

            return this.isValid(value)
                ? new Date(value.getTime())
                : null;
        }

        // Si recibimos texto
        if (typeof value === 'string') {

            const texto = value.trim();

            const coincidencia =
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
                    .exec(texto);

            if (coincidencia) {

                const dia =
                    Number(coincidencia[1]);

                const mes =
                    Number(coincidencia[2]);

                const anio =
                    Number(coincidencia[3]);

                const fecha =
                    new Date(
                        anio,
                        mes - 1,
                        dia
                    );

                // Validar que realmente exista
                // Ejemplo:
                // 31/02/2026 debe ser inválido
                if (
                    fecha.getFullYear() === anio &&
                    fecha.getMonth() === mes - 1 &&
                    fecha.getDate() === dia
                ) {
                    return fecha;
                }

                return null;
            }
        }

        return super.parse(value);
    }


    // =================================================
    // FORMATEAR FECHA EN INPUT
    // =================================================

    override format(
        date: Date,
        displayFormat: Object
    ): string {

        if (!this.isValid(date)) {
            return '';
        }

        // =============================================
        // INPUT
        // =============================================

        if (displayFormat === 'DD/MM/YYYY') {

            const dia =
                String(
                    date.getDate()
                ).padStart(2, '0');

            const mes =
                String(
                    date.getMonth() + 1
                ).padStart(2, '0');

            const anio =
                date.getFullYear();

            return `${dia}/${mes}/${anio}`;
        }

        // =============================================
        // RESTO DE FORMATOS DEL DATEPICKER
        // =============================================

        return super.format(
            date,
            displayFormat
        );
    }
}