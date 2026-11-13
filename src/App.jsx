import { appWindow } from '@tauri-apps/api/window';
import { BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { warn } from 'tauri-plugin-log-api';
import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';

import { invoke } from '@tauri-apps/api/tauri';
import Screenshot from './window/Screenshot';
import SelToolbar from './window/SelToolbar';
import Dict from './window/Dict';
import Translate from './window/Translate';
import Recognize from './window/Recognize';
import Updater from './window/Updater';
import { applyAccent, DEFAULT_ACCENT } from './utils/accent';
import { store } from './utils/store';
import Config from './window/Config';
import { useConfig } from './hooks';
import '@fontsource-variable/inter';
import './style.css';
import './i18n';

const windowMap = {
    translate: <Translate />,
    screenshot: <Screenshot />,
    recognize: <Recognize />,
    config: <Config />,
    updater: <Updater />,
    seltoolbar: <SelToolbar />,
    dict: <Dict />,
};

export default function App() {
    const [devMode] = useConfig('dev_mode', false);
    const [appTheme] = useConfig('app_theme', 'system');
    const [appLanguage] = useConfig('app_language', 'en');
    const [appFont] = useConfig('app_font', 'default');
    const [appFallbackFont] = useConfig('app_fallback_font', 'default');
    const [appFontSize] = useConfig('app_font_size', 16);
    const [appAccent] = useConfig('app_accent', DEFAULT_ACCENT);
    const { setTheme, resolvedTheme } = useTheme();
    const { i18n } = useTranslation();

    useEffect(() => {
        store.load();
    }, []);

    useEffect(() => {
        if (devMode !== null && devMode) {
            document.addEventListener('keydown', async (e) => {
                let allowKeys = ['c', 'v', 'x', 'a', 'z', 'y'];
                if (e.ctrlKey && !allowKeys.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
                if (e.key === 'F12') {
                    await invoke('open_devtools');
                }
                if (e.key.startsWith('F') && e.key.length > 1) {
                    e.preventDefault();
                }
                if (e.key === 'Escape') {
                    // the dictionary popup is only hidden, so it stays loaded for the next lookup
                    await (appWindow.label === 'dict' ? appWindow.hide() : appWindow.close());
                }
            });
        } else {
            document.addEventListener('keydown', async (e) => {
                let allowKeys = ['c', 'v', 'x', 'a', 'z', 'y'];
                if (e.ctrlKey && !allowKeys.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
                if (e.key.startsWith('F') && e.key.length > 1) {
                    e.preventDefault();
                }
                if (e.key === 'Escape') {
                    // the dictionary popup is only hidden, so it stays loaded for the next lookup
                    await (appWindow.label === 'dict' ? appWindow.hide() : appWindow.close());
                }
            });
        }
    }, [devMode]);

    useEffect(() => {
        if (appTheme !== null) {
            if (appTheme !== 'system') {
                setTheme(appTheme);
            } else {
                try {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        setTheme('dark');
                    } else {
                        setTheme('light');
                    }
                    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                        if (e.matches) {
                            setTheme('dark');
                        } else {
                            setTheme('light');
                        }
                    });
                } catch {
                    warn("Can't detect system theme.");
                }
            }
        }
    }, [appTheme]);

    // Accent colour (Config > General)
    useEffect(() => {
        if (appAccent !== null) {
            applyAccent(appAccent, resolvedTheme !== 'light');
        }
    }, [appAccent, resolvedTheme]);

    useEffect(() => {
        if (appLanguage !== null) {
            i18n.changeLanguage(appLanguage);
        }
    }, [appLanguage]);

    useEffect(() => {
        if (appFont !== null && appFallbackFont !== null) {
            // 'default' = the bundled UI font stack (see --app-font in src/style.css)
            const families = [appFont, appFallbackFont].filter((f) => f !== 'default').map((f) => `"${f}"`);
            families.push('var(--app-font)');
            document.documentElement.style.fontFamily = families.join(',');
        }
        if (appFontSize !== null) {
            document.documentElement.style.fontSize = `${appFontSize}px`;
            // the translate window sizes text with classes like text-[17px]; Tailwind only
            // builds the sizes it saw at build time, so define the current one here
            let tag = document.getElementById('font-size-rule');
            if (!tag) {
                tag = document.createElement('style');
                tag.id = 'font-size-rule';
                document.head.appendChild(tag);
            }
            tag.textContent = `.text-\\[${appFontSize}px\\]{font-size:${appFontSize}px}`;
        }
    }, [appFont, appFallbackFont, appFontSize]);

    return <BrowserRouter>{windowMap[appWindow.label]}</BrowserRouter>;
}
