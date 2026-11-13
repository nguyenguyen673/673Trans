// Dictionary popup: shows the entry of the selected word.
// Opened by the toolbar's dictionary button or its hotkey (src-tauri/src/window.rs: dict_window).
// The first service of Config > Services > Dictionary does the lookup.
import { open as openDialog } from '@tauri-apps/api/dialog';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { LuVolume2, LuSquare, LuX, LuLoader2 } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api';

import { getServiceName } from '../../utils/service_instance';
import * as dictionaryServices from '../../services/dictionary';
import { synthesize, playAudio, stopAudio } from '../SelToolbar';
import { useConfig } from '../../hooks';
import './style.css';

let blurTimeout = null;
void listen('tauri://blur', () => {
    if (appWindow.label !== 'dict') return;
    clearTimeout(blurTimeout);
    blurTimeout = setTimeout(() => appWindow.close(), 150);
});
void listen('tauri://focus', () => clearTimeout(blurTimeout));

export default function Dict() {
    const { t } = useTranslation();
    const [serviceList] = useConfig('dictionary_service_list', ['ev_offline']);
    const [word, setWord] = useState('');
    // null = loading | { entry } | { missing } | { noData } | { error }
    const [state, setState] = useState(null);
    const [speaking, setSpeaking] = useState(false);
    const [speakLoading, setSpeakLoading] = useState(false);
    const listRef = useRef(null);
    listRef.current = serviceList;

    const run = async (text) => {
        const clean = (text ?? '').trim();
        if (!clean) return;
        setWord(clean);
        setState(null);
        stopAudio();
        appWindow.show();
        appWindow.setFocus();
        const key = (listRef.current ?? ['ev_offline'])[0];
        const service = dictionaryServices[getServiceName(key ?? 'ev_offline')];
        try {
            const entry = await service.lookup(clean);
            setState(entry ? { entry } : { missing: true });
        } catch (e) {
            setState(e?.message === 'NO_DATA' ? { noData: true } : { error: String(e?.message ?? e) });
        }
    };

    useEffect(() => {
        if (serviceList === null) return;
        invoke('get_dict_text').then(run);
        const unlisten = listen('dict_text', (e) => run(e.payload));
        const onKey = (e) => e.key === 'Escape' && appWindow.close();
        window.addEventListener('keydown', onKey);
        return () => {
            unlisten.then((f) => f());
            window.removeEventListener('keydown', onKey);
        };
    }, [serviceList === null]);

    const speak = async () => {
        if (speaking) {
            stopAudio();
            return;
        }
        setSpeakLoading(true);
        try {
            const data = await synthesize(word);
            await playAudio(data, () => setSpeaking(false));
            setSpeaking(true);
        } catch (e) {
            setState({ error: String(e?.message ?? e) });
        }
        setSpeakLoading(false);
    };

    const pickData = async () => {
        const file = await openDialog({
            multiple: false,
            filters: [{ name: 'dict-data.json / .mplugin', extensions: ['json', 'mplugin', 'zip'] }],
        });
        if (!file) return;
        try {
            await invoke('dict_import', { src: file });
            dictionaryServices.ev_offline.resetCache();
            run(word);
        } catch (e) {
            setState({ error: String(e) });
        }
    };

    const entry = state?.entry;
    return (
        <div className='dict-root bg-background text-foreground border-1 border-default-200'>
            <div
                className='dict-drag'
                data-tauri-drag-region='true'
            />
            <button
                className='dict-close'
                onClick={() => appWindow.close()}
                title={t('common.cancel')}
            >
                <LuX />
            </button>
            <div className='dict-scroll'>
                <div className='dict-head'>
                    <span className='dict-word'>{entry?.word ?? word}</span>
                    {entry?.phonetic && <span className='dict-phonetic'>/{entry.phonetic}/</span>}
                    <button
                        className={`dict-speak ${speaking ? 'is-active' : ''}`}
                        onClick={speak}
                        title={speaking ? t('translate.stop') : t('translate.speak')}
                    >
                        {speakLoading ? <LuLoader2 className='dict-spin' /> : speaking ? <LuSquare /> : <LuVolume2 />}
                    </button>
                </div>

                {state === null && <div className='dict-note'>{t('dict.loading')}</div>}
                {state?.missing && <div className='dict-note'>{t('dict.not_found', { word })}</div>}
                {state?.error && <div className='dict-note dict-error'>{state.error}</div>}
                {state?.noData && (
                    <div className='dict-note'>
                        {t('dict.no_data')}
                        <button
                            className='dict-link'
                            onClick={pickData}
                        >
                            {t('dict.pick_file')}
                        </button>
                    </div>
                )}

                {entry &&
                    (entry.meanings ?? []).map((m, i) => (
                        <div
                            className='dict-meaning'
                            key={i}
                        >
                            <div className='dict-pos'>{m.partOfSpeech}</div>
                            <div className='dict-body'>
                                {(m.definitions ?? []).map((d, j) => (
                                    <p
                                        className={j === 0 ? 'dict-def is-main' : 'dict-def'}
                                        key={j}
                                    >
                                        {d}
                                    </p>
                                ))}
                                {(m.examples ?? []).slice(0, 3).map((ex, j) => (
                                    <p
                                        className='dict-example'
                                        key={j}
                                    >
                                        {typeof ex === 'string' ? ex : ex.vi ? `${ex.en} — ${ex.vi}` : ex.en}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
