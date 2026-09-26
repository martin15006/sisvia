// Hilo de trabajo que arma PDFs de chequeos (pacto para-empresas, RNF-02).
// Armar un PDF es trabajo de CPU (~100 ms cada uno): en el hilo principal, 1.000
// chequeos tardan mas de minuto y medio y ademas frenan al resto de la API.
// Repartidos en varios hilos (pdfEnHilos.js), se hacen en paralelo.
import { parentPort } from 'node:worker_threads';
import { chequeoPdfBuffer } from './chequeoPdf.js';

parentPort.on('message', async ({ id, datos }) => {
    try {
        parentPort.postMessage({ id, pdf: await chequeoPdfBuffer(datos) });
    } catch (err) {
        parentPort.postMessage({ id, error: err.message || String(err) });
    }
});
