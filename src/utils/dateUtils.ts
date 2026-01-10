/**
 * Returns a date string in YYYY-MM-DD format, specifically adjusted for GMT-5 (Ecuador/Colombia).
 * This avoids issues where UTC comparisons (like toISOString) mark today's tasks 
 * as overdue prematurely in timezones behind UTC.
 */
export function getLocalDateString(date?: Date | string | null): string {
    let d: Date;

    if (!date) {
        d = new Date();
    } else if (typeof date === 'string') {
        // Si ya es YYYY-MM-DD, devolverlo tal cual
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
        // Si tiene hora, extraer solo la fecha
        if (date.includes('T')) {
            d = new Date(date);
        } else {
            // For strings like "2026-01-09", append a time to avoid UTC-midnight shift
            d = new Date(date + 'T12:00:00');
        }
    } else {
        d = date;
    }

    if (isNaN(d.getTime())) d = new Date();

    // Usar Intl.DateTimeFormat para extraer partes de la fecha en GMT-5 (America/Bogota)
    // Esto funciona independientemente de la zona horaria del navegador/servidor.
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Bogota', // GMT-5 year-round
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    // sv-SE (Suecia) usa el formato YYYY-MM-DD por defecto
    return formatter.format(d);
}

/**
 * Formats a YYYY-MM-DD string into DD/MM/YYYY for display.
 * Avoids any Date object shifts by parsing the string directly.
 */
export function formatLocalDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-');
        return `${parseInt(day)}/${parseInt(month)}/${year}`;
    } catch (e) {
        return dateStr || '';
    }
}
