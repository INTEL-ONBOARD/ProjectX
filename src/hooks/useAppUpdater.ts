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

const getApi = () => (typeof window !== 'undefined' ? (window as any).electronAPI : null);
const isElectron = () => !!(getApi()?.checkForUpdate);

export function useAppUpdater() {
    const [state, setState] = useState<UpdateState>({
        status: 'idle',
        version: null,
        progress: null,
        errorMessage: null,
        appVersion: null,
    });

    useEffect(() => {
        if (!isElectron()) return;
        const api = getApi();

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
        if (!isElectron()) return;
        // Set checking immediately so the UI responds before the IPC event arrives
        setState(s => ({ ...s, status: 'checking', errorMessage: null }));
        getApi().checkForUpdate();
    }, []);

    const installUpdate = useCallback(() => {
        if (!isElectron()) return;
        getApi().installUpdate();
    }, []);

    const openReleasesPage = useCallback(() => {
        const api = getApi();
        if (api?.openExternal) {
            api.openExternal('https://github.com/INTEL-ONBOARD/ProjectM/releases/latest');
        }
    }, []);

    const dismiss = useCallback(() => {
        setState(s => ({ ...s, status: 'idle', errorMessage: null }));
    }, []);

    return { state, checkForUpdate, installUpdate, openReleasesPage, dismiss, isElectron: isElectron() };
}
