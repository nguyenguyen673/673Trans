// Selection toolbar: the small floating bar shown after selecting text anywhere.
// Native side (mouse hook, positioning, focus handling): src-tauri/src/sel_toolbar.rs
//
// Which buttons are shown (and their order) comes from the config key
// `selection_toolbar_actions`, edited in Config > Selection toolbar.
// Want a new kind of button? Add it to `actions` below and to ACTION_IDS in
// src/window/Config/pages/Toolbar/index.jsx. The bar resizes itself.
import { sendNotification } from '@tauri-apps/api/notification';
import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs';
import React, { useEffect, useRef, useState } from 'react';
import { LuLanguages, LuReplace, LuVolume2, LuSquare, LuCopy, LuClipboardCopy, LuCheck } from 'react-icons/lu';
import { writeText } from '@tauri-apps/api/clipboard';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { error as logError } from 'tauri-plugin-log-api';
import { invoke } from '@tauri-apps/api';
import { recognizeScreenshot } from '../../utils/recognize_first';

import { getServiceName, whetherPluginService } from '../../utils/service_instance';
import * as builtinTranslateServices from '../../services/translate';
import * as builtinTtsServices from '../../services/tts';
import { invoke_plugin } from '../../utils/invoke_plugin';
import detect from '../../utils/lang_detect';
import { store } from '../../utils/store';
import { useConfig } from '../../hooks';
import './style.css';

const DEFAULT_TRANSLATE_SERVICES = ['deepl', 'bing', 'lingva', 'yandex', 'google', 'ecdict'];
const DEFAULT_TTS_SERVICES = ['lingva_tts'];
export const DEFAULT_ACTIONS = ['translate', 'replace', 'speak'];

async function readPluginInfo(pluginType, pluginName) {
    const text = await readTextFile(`plugins/${pluginType}/${pluginName}/info.json`, {
        dir: BaseDirectory.AppConfig,
    });
    return JSON.parse(text);
}

// Run one translate service and return plain text (throws if it can't)
async function translateWith(instanceKey, text, sourceLanguage, targetLanguage, detected) {
    const serviceName = getServiceName(instanceKey);
    const config = (await store.get(instanceKey)) ?? {};
    let streamed = '';
    const options = {
        config,
        detect: detected,
        // Streaming services (OpenAI, ...) report partial results here
        setResult: (v) => {
            if (typeof v === 'string') streamed = v;
        },
    };

    let result;
    if (whetherPluginService(instanceKey)) {
        const pluginInfo = await readPluginInfo('translate', serviceName);
        if (!(sourceLanguage in pluginInfo.language) || !(targetLanguage in pluginInfo.language)) {
            throw new Error('Language not supported');
        }
        config['enable'] = 'true';
        const [func, utils] = await invoke_plugin('translate', serviceName);
        result = await func(text, pluginInfo.language[sourceLanguage], pluginInfo.language[targetLanguage], {
            ...options,
            utils,
        });
    } else {
        const service = builtinTranslateServices[serviceName];
        if (!service) throw new Error(`Unknown service: ${serviceName}`);
        const LanguageEnum = service.Language;
        if (!(sourceLanguage in LanguageEnum) || !(targetLanguage in LanguageEnum)) {
            throw new Error('Language not supported');
        }
        result = await service.translate(text, LanguageEnum[sourceLanguage], LanguageEnum[targetLanguage], options);
    }

    if (typeof result !== 'string' || result.trim() === '') {
        // Dictionary style services return objects: not something we can paste
        result = streamed.replace(/_$/, '');
    }
    if (typeof result !== 'string' || result.trim() === '') {
        throw new Error('No plain text result');
    }
    return result.trim();
}

// Translate with the user's services (same order as the translate window),
// using the first one that gives plain text.
async function translateForPaste(text) {
    const serviceList = (await store.get('translate_service_list')) ?? DEFAULT_TRANSLATE_SERVICES;
    const sourceLanguage = (await store.get('translate_source_language')) ?? 'auto';
    let targetLanguage = (await store.get('translate_target_language')) ?? 'zh_cn';
    const secondLanguage = (await store.get('translate_second_language')) ?? 'en';
    const detected = await detect(text);
    // Same rule as the translate window: text already in the target language
    // goes to the secondary target language instead.
    if (sourceLanguage === 'auto' && targetLanguage === detected) {
        targetLanguage = secondLanguage;
    }

    // Disabled services are skipped; services set to "only when opened" are tried last
    const automatic = [];
    const manual = [];
    for (const instanceKey of serviceList) {
        const config = (await store.get(instanceKey)) ?? {};
        if (!(config.enable ?? true)) continue;
        (config.auto ?? true ? automatic : manual).push(instanceKey);
    }

    let lastError = new Error('No translate service configured');
    for (const instanceKey of [...automatic, ...manual]) {
        try {
            return await translateWith(instanceKey, text, sourceLanguage, targetLanguage, detected);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError;
}

// Text to speech with the first TTS service (same as the speak button in the translate window)
async function synthesize(text) {
    const serviceList = (await store.get('tts_service_list')) ?? DEFAULT_TTS_SERVICES;
    const instanceKey = serviceList[0];
    if (!instanceKey) throw new Error('No TTS service configured');
    const serviceName = getServiceName(instanceKey);
    const config = (await store.get(instanceKey)) ?? {};
    const detected = await detect(text);

    if (whetherPluginService(instanceKey)) {
        const pluginInfo = await readPluginInfo('tts', serviceName);
        if (!(detected in pluginInfo.language)) throw new Error('Language not supported');
        const [func, utils] = await invoke_plugin('tts', serviceName);
        return await func(text, pluginInfo.language[detected], { config, utils });
    }
    const service = builtinTtsServices[serviceName];
    if (!service) throw new Error(`Unknown service: ${serviceName}`);
    if (!(detected in service.Language)) throw new Error('Language not supported');
    return await service.tts(text, service.Language[detected], { config });
}

let audioContext = null;
let audioSource = null;

function stopAudio() {
    if (audioSource) {
        try {
            audioSource.stop();
        } catch {}
    }
}

// Resolves once playback has started; `onEnded` fires when it finishes or is stopped
async function playAudio(data, onEnded) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    const buffer = await audioContext.decodeAudioData(new Uint8Array(data).buffer);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => {
        source.disconnect();
        if (audioSource === source) audioSource = null;
        onEnded();
    };
    audioSource = source;
    source.start();
}

export default function SelToolbar() {
    const { t } = useTranslation();
    // null | 'translate' | 'paste' | 'voice'
    const [busy, setBusy] = useState(null);
    const [speaking, setSpeaking] = useState(false);
    // name of the button that just failed (flashes red)
    const [failed, setFailed] = useState(null);
    // name of the button that just succeeded (shows a check mark)
    const [done, setDone] = useState(null);
    const [enabledActions] = useConfig('selection_toolbar_actions', DEFAULT_ACTIONS);
    const [layout] = useConfig('selection_toolbar_layout', 'horizontal');
    const [display] = useConfig('selection_toolbar_display', 'icon');
    const failTimer = useRef(null);

    useEffect(() => {
        // The bar was shown for a new selection
        const unlisten = listen('sel_toolbar_show', () => {
            setFailed(null);
            setDone(null);
        });
        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    // Global hotkeys (Config > Hotkeys) run these actions without showing the bar.
    // The handler is kept in a ref so it always sees the latest functions.
    const hotkeyRef = useRef(null);
    useEffect(() => {
        const unlisten = listen('sel_toolbar_hotkey', (event) => hotkeyRef.current?.(event.payload));
        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    const fail = (button, e) => {
        const message = e?.message ?? String(e);
        if (message === 'cancelled') return;
        logError(`[selection toolbar] ${button}: ${message}`);
        setFailed(button);
        clearTimeout(failTimer.current);
        failTimer.current = setTimeout(() => setFailed(null), 1500);
        sendNotification({ title: '673Trans', body: message });
    };

    const onTranslate = async () => {
        if (busy) return;
        try {
            await invoke('sel_toolbar_translate');
        } catch (e) {
            fail('translate', e);
        }
    };

    // Shared flow for the buttons that translate first: `finish` gets the translation
    const translateThen = async (button, finish) => {
        if (busy) return;
        setBusy(button);
        await invoke('sel_toolbar_busy', { busy: true });
        try {
            const text = (await invoke('sel_toolbar_capture', { hide: false })).trim();
            if (text === '') throw new Error(t('translate.no_selection'));
            const result = await translateForPaste(text);
            await finish(result);
        } catch (e) {
            fail(button, e);
            await invoke('sel_toolbar_busy', { busy: false });
        } finally {
            setBusy(null);
        }
    };

    // Show a check mark for a moment, then hide the bar
    const flashDone = async (button) => {
        setDone(button);
        await new Promise((resolve) => setTimeout(resolve, 650));
        setDone(null);
        await invoke('sel_toolbar_hide');
    };

    // Translate, then paste over the selection
    const onReplace = () => translateThen('replace', (result) => invoke('sel_toolbar_paste', { text: result }));

    // Translate, then put the translation on the clipboard
    const onTranslateCopy = () =>
        translateThen('translate_copy', async (result) => {
            await writeText(result);
            await flashDone('translate_copy');
        });

    // Copy the selected text as is
    const onCopy = async () => {
        if (busy) return;
        try {
            const text = (await invoke('sel_toolbar_capture', { hide: false })).trim();
            if (text === '') throw new Error(t('translate.no_selection'));
            await writeText(text);
            await flashDone('copy');
        } catch (e) {
            fail('copy', e);
        }
    };

    const onVoice = async () => {
        if (speaking) {
            stopAudio();
            return;
        }
        if (busy) return;
        setBusy('speak');
        // Stay on screen while loading / speaking so it can be stopped
        await invoke('sel_toolbar_sticky', { sticky: true });
        try {
            const text = (await invoke('sel_toolbar_capture', { hide: false })).trim();
            if (text === '') throw new Error(t('translate.no_selection'));
            const data = await synthesize(text);
            await playAudio(data, () => {
                setSpeaking(false);
                invoke('sel_toolbar_hide');
            });
            setSpeaking(true);
        } catch (e) {
            fail('speak', e);
            await invoke('sel_toolbar_sticky', { sticky: false });
        } finally {
            setBusy(null);
        }
    };

    // Every button the bar knows about
    const actions = {
        translate: { title: t('translate.translate'), icon: <LuLanguages />, onClick: onTranslate },
        replace: { title: t('translate.paste_translation'), icon: <LuReplace />, onClick: onReplace },
        translate_copy: { title: t('translate.translate_copy'), icon: <LuClipboardCopy />, onClick: onTranslateCopy },
        speak: {
            title: speaking ? t('translate.stop') : t('translate.speak'),
            icon: speaking ? <LuSquare /> : <LuVolume2 />,
            onClick: onVoice,
            active: speaking,
        },
        copy: { title: t('translate.copy'), icon: <LuCopy />, onClick: onCopy },
    };
    hotkeyRef.current = async (action) => {
        try {
            if (action === 'translate_copy') await onTranslateCopy();
            else if (action === 'replace') await onReplace();
            else if (action === 'speak') await onVoice();
            else if (action === 'ocr_copy' || action === 'ocr_translate_copy') {
                const text = await recognizeScreenshot();
                const out = action === 'ocr_copy' ? text : await translateForPaste(text);
                await writeText(out);
                sendNotification({ title: '673Trans', body: out.length > 120 ? out.slice(0, 120) + '…' : out });
            }
        } catch (e) {
            fail(action, e);
        }
    };
    const buttons = (enabledActions ?? DEFAULT_ACTIONS)
        .filter((name) => name in actions)
        .map((name) => ({ name, ...actions[name] }));

    return (
        <div className='sel-toolbar-root'>
            <div
                className={`sel-toolbar bg-content1 text-foreground border-1 border-default-200 ${
                    layout === 'vertical' ? 'is-vertical' : ''
                } display-${display ?? 'icon'}`}
            >
                {buttons.map((button) => (
                    <button
                        key={button.name}
                        type='button'
                        title={button.title}
                        className={[
                            'sel-toolbar-button',
                            button.active ? 'is-active' : '',
                            failed === button.name ? 'is-failed' : '',
                        ].join(' ')}
                        // Never let the webview grab focus / start a drag
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={button.onClick}
                    >
                        {busy === button.name ? (
                            <span className='sel-toolbar-spinner' />
                        ) : done === button.name ? (
                            <LuCheck className='text-success' />
                        ) : display === 'text' ? null : (
                            button.icon
                        )}
                        {display !== 'icon' && (
                            <span className='sel-toolbar-label'>
                                {speaking && button.name === 'speak'
                                    ? t('translate.stop')
                                    : t(`config.toolbar.short.${button.name}`)}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
