// Reparte PDFs de chequeos entre varios hilos (pacto para-empresas, RNF-02).
// Uno por nucleo libre, hasta 4: deja siempre un nucleo para que la API siga
// respondiendo mientras se exporta. Si los hilos no arrancan, los arma aca mismo.
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { chequeoPdfBuffer } from './chequeoPdf.js';

export const hilosParaPdf = () => Math.max(1, Math.min(4, availableParallelism() - 1));

export const crearGeneradorPdf = (cantidad = hilosParaPdf()) => {
    let hilos = [];
    try {
        hilos = Array.from({ length: cantidad }, () => new Worker(new URL('./pdfTrabajador.js', import.meta.url)));
    } catch (err) {
        console.error('[respaldo] no arrancaron los hilos de PDF; se arman en el hilo principal:', err.message);
    }
    const pendientes = new Map(); // id -> { listo, fallo }
    let siguiente = 0;

    for (const hilo of hilos) {
        hilo.on('message', ({ id, pdf, error }) => {
            const p = pendientes.get(id);
            if (!p) return;
            pendientes.delete(id);
            if (error) p.fallo(new Error(error));
            else p.listo(Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength));
        });
        // Si un hilo se cae, fallan los PDF que esperaban (la exportacion se corta entera).
        hilo.on('error', (err) => {
            for (const p of pendientes.values()) p.fallo(err);
            pendientes.clear();
        });
    }

    const generar = (datos) => {
        if (hilos.length === 0) return chequeoPdfBuffer(datos);
        const id = siguiente++;
        return new Promise((listo, fallo) => {
            pendientes.set(id, { listo, fallo });
            hilos[id % hilos.length].postMessage({ id, datos });
        });
    };
    const cerrar = () => Promise.all(hilos.map((h) => h.terminate()));

    return { generar, cerrar, hilos: hilos.length };
};
