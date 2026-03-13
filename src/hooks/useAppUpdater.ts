import { useCallback, useEffect, useState } from 'react';

export type UpdateStatus =
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error';

export interface UpdateState {
    status: UpdateStatus;
    version: string | null;
    progress: number | null; // 0–100
    errorMessage: string | null;
    appVersion: string | null;
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.checkForUpdate;

export function useAppUpdater() {
    const [state, setState] = useState<UpdateState>({
        status: 'idle',
        version: null,
        progress: null,
        errorMessage: null,
        appVersion: null,
    });

    useEffect(() => {
        if (!isElectron) return;

        const api = (window as any).electronAPI;

        // Get current app version
        api.getVersion?.().then((v: string) =>
            setState(s => ({ ...s, appVersion: v }))
        );

        const cleanups: (() => void)[] = [];

        cleanups.push(api.onUpdateChecking(() => {
            setState(s => ({ ...s, status: 'checking', errorMessage: null }));
        }));

        cleanups.push(api.onUpdateAvailable((_: unknown, info: { version: string }) => {
            setState(s => ({ ...s, status: 'available', version: info.version }));
        }));

        cleanups.push(api.onUpdateNotAvailable(() => {
            setState(s => ({ ...s, status: 'not-available' }));
            // Reset back to idle after a moment
            setTimeout(() => setState(s => ({ ...s, status: 'idle' })), 3000);
        }));

        cleanups.push(api.onDownloadProgress((_: unknown, p: { percent: number }) => {
            setState(s => ({ ...s, status: 'downloading', progress: p.percent }));
        }));

        cleanups.push(api.onUpdateDownloaded((_: unknown, info: { version: string }) => {
            setState(s => ({ ...s, status: 'downloaded', version: info.version, progress: 100 }));
        }));

        cleanups.push(api.onUpdateError((_: unknown, message: string) => {
            setState(s => ({ ...s, status: 'error', errorMessage: message }));
        }));

        return () => cleanups.forEach(fn => fn());
    }, []);

    const checkForUpdate = useCallback(() => {
        if (!isElectron) return;
        (window as any).electronAPI.checkForUpdate();
    }, []);

    const installUpdate = useCallback(() => {
        if (!isElectron) return;
        (window as any).electronAPI.installUpdate();
    }, []);

    const dismiss = useCallback(() => {
        setState(s => ({ ...s, status: 'idle', errorMessage: null }));
    }, []);

    return { state, checkForUpdate, installUpdate, dismiss, isElectron };
}
