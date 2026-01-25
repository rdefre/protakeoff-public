import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

interface MenuEventHandlers {
    onNewProject?: () => void;
    onOpen?: () => void;
    onSave?: () => void;
    onSaveAs?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onShowHelp?: () => void;
    onLicenseStatus?: () => void;
    onAbout?: () => void;
}

/**
 * Hook to listen for native menu events from Tauri
 */
export function useMenuEvents(handlers: MenuEventHandlers) {
    useEffect(() => {
        const unlisten = listen<string>('menu-event', (event) => {
            console.log('[Menu Event]', event.payload);

            switch (event.payload) {
                case 'new_project':
                    handlers.onNewProject?.();
                    break;
                case 'open':
                    handlers.onOpen?.();
                    break;
                case 'save':
                    handlers.onSave?.();
                    break;
                case 'save_as':
                    handlers.onSaveAs?.();
                    break;
                case 'undo':
                    handlers.onUndo?.();
                    break;
                case 'redo':
                    handlers.onRedo?.();
                    break;
                case 'help_guide':
                    handlers.onShowHelp?.();
                    break;
                case 'license_status':
                    handlers.onLicenseStatus?.();
                    break;
                case 'about':
                    handlers.onAbout?.();
                    break;
            }
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [handlers]);
}
