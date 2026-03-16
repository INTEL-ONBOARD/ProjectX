'use strict';
/**
 * bcrypt-worker.js
 * Runs bcrypt operations (hash / compare) in a dedicated worker thread
 * so the Electron main process is never blocked by CPU-intensive crypto.
 *
 * Message protocol (parentPort):
 *   Incoming: { id: number, type: 'hash', password: string, rounds: number }
 *           | { id: number, type: 'compare', password: string, hash: string }
 *   Outgoing: { id: number, result: string | boolean }
 *           | { id: number, error: string }
 */
const { parentPort } = require('worker_threads');
const bcrypt = require('bcryptjs');

parentPort.on('message', async ({ id, type, password, hash, rounds }) => {
    try {
        let result;
        if (type === 'hash') {
            result = await bcrypt.hash(password, rounds ?? 10);
        } else if (type === 'compare') {
            result = await bcrypt.compare(password, hash);
        } else {
            throw new Error(`Unknown bcrypt-worker type: ${type}`);
        }
        parentPort.postMessage({ id, result });
    } catch (err) {
        parentPort.postMessage({ id, error: err.message });
    }
});
