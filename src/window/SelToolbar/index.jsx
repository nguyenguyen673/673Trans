// Selection toolbar: the small floating bar shown after selecting text anywhere.
// Native side (mouse hook, positioning, focus handling): src-tauri/src/sel_toolbar.rs
//
// Want another button? Add an entry to the JSX at the bottom and widen
// BAR_W in sel_toolbar.rs (about 40px per button).
import { sendNotification } from '@tauri-apps/api/notification';
import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs';
import React, { useEffect, useRef, useState } from 'react';
import { MdOutlineContentPasteGo } from 'react-icons/md';
import { HiOutlineVolumeUp, HiOutlineStop, HiTranslate } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { error as logError } from 'tauri-plugin-log-api';
import { invoke } from '@tauri-apps/api';

import { getServiceName, whetherPluginService } from '../../utils/service_instance';
import * as builtinTranslateServices from '../../services/translate';
import * as builtinTtsServices from '../../services/tts';
import { invoke_plugin } from '../../utils/invoke_plugin';
import detect from '../../utils/lang_detect';
import { store } from '../../utils/store';
import './style.css';

const DEFAULT_TRANSLATE_SERVICES = ['deepl', 'bing', 'lingva', 'yandex', 'google', 'ecdict'];
const DEFAULT_TTS_SERVICES = ['lingva_tts'];

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

    let lastError = new Error('No translate service configured');
    for (const instanceKey of serviceList) {
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
    const failTimer = useRef(null);

    useEffect(() => {
        // The bar was shown for a new selection
        const unlisten = listen('sel_toolbar_show', () => {
            setFailed(null);
        });
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

    const onPaste = async () => {
        if (busy) return;
        setBusy('paste');
        await invoke('sel_toolbar_busy', { busy: true });
        try {
            const text = (await invoke('sel_toolbar_capture', { hide: false })).trim();
            if (text === '') throw new Error(t('translate.no_selection'));
            const result = await translateForPaste(text);
            await invoke('sel_toolbar_paste', { text: result });
        } catch (e) {
            fail('paste', e);
            await invoke('sel_toolbar_busy', { busy: false });
        } finally {
            setBusy(null);
        }
    };

    const onVoice = async () => {
        if (speaking) {
            stopAudio();
            return;
        }
        if (busy) return;
        setBusy('voice');
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
            fail('voice', e);
            await invoke('sel_toolbar_sticky', { sticky: false });
        } finally {
            setBusy(null);
        }
    };

    const buttons = [
        {
            name: 'translate',
            title: t('translate.translate'),
            icon: <HiTranslate />,
            onClick: onTranslate,
        },
        {
            name: 'paste',
            title: t('translate.paste_translation'),
            icon: <MdOutlineContentPasteGo />,
            onClick: onPaste,
        },
        {
            name: 'voice',
            title: speaking ? t('translate.stop') : t('translate.speak'),
            icon: speaking ? <HiOutlineStop /> : <HiOutlineVolumeUp />,
            onClick: onVoice,
            active: speaking,
        },
    ];

    return (
        <div className='sel-toolbar-root'>
            <div className='sel-toolbar bg-content1 text-foreground border-1 border-default-200'>
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
                        {busy === button.name ? <span className='sel-toolbar-spinner' /> : button.icon}
                    </button>
                ))}
            </div>
        </div>
    );
}
