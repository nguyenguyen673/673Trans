// Dictionary popup: shows the entry of the selected word.
// Opened by the toolbar's dictionary button or its hotkey (src-tauri/src/window.rs: dict_window).
// The first service of Config > Services > Dictionary does the lookup.
import { open as openDialog } from '@tauri-apps/api/dialog';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { LuVolume2, LuSquare, LuX, LuLoader2, LuBookOpen, LuChevronDown } from 'react-icons/lu';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api';

import { getServiceName } from '../../utils/service_instance';
import * as dictionaryServices from '../../services/dictionary';
import { synthesize, playAudio, stopAudio } from '../SelToolbar';
import { useEnabledList } from '../../hooks';
import { filterEnabled } from '../../hooks/useEnabledList';
import { store } from '../../utils/store';
import * as translateServices from '../../services/translate';
import { applyMode, LLM_SERVICES } from '../../utils/translate_mode';
import { LuSparkles } from 'react-icons/lu';
import './style.css';

let blurTimeout = null;
void listen('tauri://blur', () => {
    if (appWindow.label !== 'dict') return;
    clearTimeout(blurTimeout);
    blurTimeout = setTimeout(() => appWindow.hide(), 150);
});
void listen('tauri://focus', () => clearTimeout(blurTimeout));

export default function Dict() {
    const { t } = useTranslation();
    const [serviceList] = useEnabledList('dictionary_service_list', ['ev_offline', 'wiktionary']);
    const [word, setWord] = useState('');
    // null = loading | { entry } | { missing } | { noData } | { error }
    const [state, setState] = useState(null);
    const [prons, setProns] = useState([]);
    const [playing, setPlaying] = useState('');
    const [speakError, setSpeakError] = useState('');
    const [similar, setSimilar] = useState([]);
    const [ai, setAi] = useState({ text: '', loading: false, error: '', name: '' });
    const aiId = useRef(0);
    const [speaking, setSpeaking] = useState(false);
    const [speakLoading, setSpeakLoading] = useState(false);
    const listRef = useRef(null);
    const curRef = useRef(null);
    const [current, setCurrent] = useState(null);
    listRef.current = serviceList;

    // AI explanation with the first AI service of the translate list
    const explain = async (text) => {
        const id = ++aiId.current;
        setAi({ text: '', loading: true, error: '', name: '' });
        try {
            const list = await filterEnabled((await store.get('translate_service_list')) ?? []);
            const key = list.find((k) => LLM_SERVICES.includes(getServiceName(k)));
            if (!key) throw new Error(t('dict.ai_no_service'));
            const name = getServiceName(key);
            const service = translateServices[name];
            const L = service.Language ?? {};
            const config = applyMode(name, (await store.get(key)) ?? {}, 'explain');
            const result = await service.translate(text, L.en ?? 'English', L.vi ?? 'Vietnamese', {
                config: { ...config, stream: config.stream ?? true },
                detect: 'en',
                setResult: (v) => {
                    if (aiId.current === id) setAi((a) => ({ ...a, text: String(v), loading: true }));
                },
            });
            if (aiId.current === id) setAi({ text: String(result ?? '').trim(), loading: false, error: '', name });
        } catch (e) {
            if (aiId.current === id) setAi({ text: '', loading: false, error: String(e?.message ?? e), name: '' });
        }
    };

    const menuTitle = (key) => {
        if (!key) return '';
        const name = getServiceName(key);
        return t(`services.dictionary.${name}.title`);
    };

    const run = async (text, keyOverride, skipAi) => {
        const clean = (text ?? '').trim();
        if (!clean) return;
        setWord(clean);
        setState(null);
        setProns([]);
        setSimilar([]);
        stopAudio();
        aiId.current++;
        setAi({ text: '', loading: false, error: '', name: '' });
        appWindow.show();
        appWindow.setFocus();
        const list = listRef.current ?? ['ev_offline'];
        const key = keyOverride ?? (list.includes(curRef.current) ? curRef.current : list[0]);
        curRef.current = key;
        setCurrent(key);
        const service = dictionaryServices[getServiceName(key ?? 'ev_offline')];
        try {
            const entry = await service.lookup(clean);
            setState(entry ? { entry } : { missing: true });
            if (!entry) {
                // typos: suggest similar words from the offline dictionary when it is installed
                dictionaryServices.ev_offline
                    .suggest(clean)
                    .then((w) => setSimilar(w.filter((x) => x !== clean.toLowerCase())))
                    .catch(() => {});
            }
            if (entry?.reverse) setProns([]);
            else if (entry?.pron) setProns(entry.pron);
            else if (entry && service.pronunciations) {
                service.pronunciations(entry.word || clean).then((p) => setProns(p.filter((x) => x.label === 'US')));
            }
        } catch (e) {
            setState(e?.message === 'NO_DATA' ? { noData: true } : { error: String(e?.message ?? e) });
        }
    };

    // remember the size the user gives the popup
    useEffect(() => {
        let timer = null;
        const unlisten = appWindow.onResized(({ payload }) => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const factor = await appWindow.scaleFactor();
                const size = payload.toLogical(factor);
                await store.set('dict_window_w', Math.round(size.width));
                await store.set('dict_window_h', Math.round(size.height));
                await store.save();
            }, 400);
        });
        return () => {
            clearTimeout(timer);
            unlisten.then((f) => f());
        };
    }, []);

    useEffect(() => {
        if (serviceList === null) return;
        invoke('get_dict_text').then((x) => run(x));
        const unlisten = listen('dict_text', (e) => run(e.payload));
        return () => {
            unlisten.then((f) => f());
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

    const playPron = async (p) => {
        const id = p.label || 'x';
        if (playing === id) {
            stopAudio();
            setPlaying('');
            return;
        }
        stopAudio();
        setPlaying(id);
        setSpeakError('');
        const done = () => setPlaying('');
        // 1) recorded audio from the web, 2) fall back to the configured TTS service
        if (p.audio) {
            try {
                const data = await dictionaryServices.ev_offline.fetchAudio(p.audio);
                await playAudio(data, done);
                return;
            } catch (e) {
                console.error('dict audio failed', e);
                setSpeakError(t('dict.audio_fallback'));
            }
        }
        try {
            const data = await synthesize(word);
            await playAudio(data, done);
        } catch (e) {
            setPlaying('');
            setSpeakError(String(e?.message ?? e));
        }
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
            <Dropdown>
                <DropdownTrigger>
                    <button className='dict-menu'>
                        <LuBookOpen />
                        <span>{menuTitle(current ?? (serviceList ?? [])[0])}</span>
                        <LuChevronDown />
                    </button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label='dictionary'
                    selectionMode='single'
                    selectedKeys={new Set([current ?? (serviceList ?? [])[0]])}
                    onAction={(key) => {
                        setCurrent(key);
                        run(word, key, true);
                    }}
                >
                    {(serviceList ?? []).map((k) => (
                        <DropdownItem key={k}>{menuTitle(k)}</DropdownItem>
                    ))}
                </DropdownMenu>
            </Dropdown>
            <button
                className='dict-close'
                onClick={() => appWindow.hide()}
                title={t('common.cancel')}
            >
                <LuX />
            </button>
            <div className='dict-scroll'>
                <div className='dict-head'>
                    <span className='dict-word'>{entry?.word ?? word}</span>
                </div>
                {entry && !entry.reverse && (
                    <div className='dict-prons'>
                        {(prons.length ? prons : [{ label: '', ipa: '', audio: '' }]).map((p, i) => (
                            <span
                                className='dict-pron'
                                key={i}
                            >
                                {p.label && <b className='dict-accent'>{p.label}</b>}
                                {(p.ipa || (!prons.length && entry.phonetic)) && (
                                    <span className='dict-ipa'>{p.ipa ? p.ipa : `/${entry.phonetic}/`}</span>
                                )}
                                <button
                                    className={`dict-speak ${playing === (p.label || 'x') ? 'is-active' : ''}`}
                                    onClick={() => playPron(p)}
                                >
                                    {playing === (p.label || 'x') ? <LuSquare /> : <LuVolume2 />}
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {speakError && <div className='dict-note dict-error'>{speakError}</div>}
                {state === null && <div className='dict-note'>{t('dict.loading')}</div>}
                {state?.missing && (
                    <div className='dict-note'>
                        {t('dict.not_found', { word })}
                        {similar.length > 0 && (
                            <div className='dict-similar'>
                                <span>{t('dict.similar')}</span>
                                {similar.map((w) => (
                                    <button
                                        key={w}
                                        className='dict-chip'
                                        onClick={() => run(w, undefined, true)}
                                    >
                                        {w}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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

                {entry?.reverse && (
                    <div className='dict-reverse'>
                        {entry.reverse.map((r) => (
                            <button
                                key={r.word}
                                className='dict-rev'
                                onClick={() => run(r.word, undefined, true)}
                            >
                                <b>{r.word}</b>
                                <span>{r.gloss}</span>
                            </button>
                        ))}
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
                                {(m.senses ?? []).map((sn, j) => (
                                    <div
                                        className='dict-sense'
                                        key={`s${j}`}
                                    >
                                        <p className={j === 0 ? 'dict-def is-main' : 'dict-def'}>{sn.gloss}</p>
                                        {sn.examples.map((ex, k) => (
                                            <p
                                                className='dict-example'
                                                key={k}
                                            >
                                                {ex}
                                            </p>
                                        ))}
                                    </div>
                                ))}
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
                {entry && !entry.reverse && !ai.loading && !ai.text && !ai.error && (
                    <button
                        className='dict-ai-btn'
                        onClick={() => explain(word)}
                    >
                        <LuSparkles /> {t('dict.ai_title')}
                    </button>
                )}
                {(ai.loading || ai.text || ai.error) && (
                    <div className='dict-ai'>
                        <div className='dict-ai-head'>
                            <LuSparkles /> {t('dict.ai_title')}
                            {ai.loading && <LuLoader2 className='dict-spin' />}
                            {!ai.loading && (
                                <button
                                    className='dict-link'
                                    onClick={() => explain(word)}
                                >
                                    {t('dict.ai_retry')}
                                </button>
                            )}
                        </div>
                        {ai.error ? (
                            <div className='dict-error'>{ai.error}</div>
                        ) : (
                            <div className='dict-ai-text'>{ai.text}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
