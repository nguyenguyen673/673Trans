// Dictionary popup. Opened by the toolbar's dictionary buttons or their hotkeys
// (src-tauri/src/window.rs: dict_window). The window is hidden, not closed, when dismissed so the
// dictionary stays loaded and the next lookup is instant.
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import {
    LuVolume2,
    LuSquare,
    LuX,
    LuLoader2,
    LuBookOpen,
    LuChevronDown,
    LuSparkles,
    LuSearch,
    LuHistory,
    LuStar,
    LuCheck,
} from 'react-icons/lu';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api';

import { getServiceName, getDisplayInstanceName, INSTANCE_NAME_CONFIG_KEY } from '../../utils/service_instance';
import { findAiDictConfig, runAi } from '../../services/dictionary/ai_dict/provider';
import { useEnabledList, filterEnabled } from '../../hooks/useEnabledList';
import * as collectionServices from '../../services/collection';
import * as dictionaryServices from '../../services/dictionary';
import { synthesize, playAudio, stopAudio } from '../SelToolbar';
import { Meanings, ReverseList, entrySummary } from './Entry';
import { addHistory } from '../../utils/dict_history';
import HistoryPanel from './HistoryPanel';
import { store } from '../../utils/store';
import './style.css';

// Ignore blurs right after (re)opening: the toolbar click or the source app taking focus back
// would otherwise hide the popup the moment it appears.
const BLUR_GRACE_MS = 900;
let blurTimeout = null;
let openedAt = 0;
void listen('tauri://blur', () => {
    if (appWindow.label !== 'dict') return;
    clearTimeout(blurTimeout);
    if (Date.now() - openedAt < BLUR_GRACE_MS) {
        appWindow.setFocus();
        return;
    }
    blurTimeout = setTimeout(() => {
        if (Date.now() - openedAt >= BLUR_GRACE_MS) appWindow.hide();
    }, 150);
});
void listen('tauri://focus', () => clearTimeout(blurTimeout));

export default function Dict() {
    const { t } = useTranslation();
    const [serviceList] = useEnabledList('dictionary_service_list', ['ev_offline', 'wiktionary', 'ai_dict']);
    const [names, setNames] = useState({}); // instance key -> name set in Config > Services
    const [current, setCurrent] = useState(null); // instance key in use
    const [query, setQuery] = useState(''); // text of the search box
    const [word, setWord] = useState(''); // word shown
    // null = loading | { idle } | { entry } | { missing } | { noData } | { error }
    const [state, setState] = useState({ idle: true });
    const [prons, setProns] = useState([]);
    const [playing, setPlaying] = useState('');
    const [speakError, setSpeakError] = useState('');
    const [similar, setSimilar] = useState([]);
    const [ai, setAi] = useState({ text: '', loading: false, error: '' });
    const [showHistory, setShowHistory] = useState(false);
    const [saved, setSaved] = useState(''); // '' | 'ok' | message
    const aiId = useRef(0);
    const listRef = useRef(null);
    const curRef = useRef(null);
    const inputRef = useRef(null);
    listRef.current = serviceList;

    const menuTitle = (key) => {
        if (!key) return '';
        return getDisplayInstanceName(names[key], () => t(`services.dictionary.${getServiceName(key)}.title`));
    };

    useEffect(() => {
        if (!serviceList) return;
        (async () => {
            const out = {};
            for (const k of serviceList) out[k] = ((await store.get(k)) ?? {})[INSTANCE_NAME_CONFIG_KEY];
            setNames(out);
        })();
    }, [JSON.stringify(serviceList)]);

    // ---- lookup -------------------------------------------------------------------------------
    const run = async (text, keyOverride) => {
        const clean = (text ?? '').trim();
        openedAt = Date.now();
        clearTimeout(blurTimeout);
        appWindow.show();
        appWindow.setFocus();
        // the source app may take the focus back a moment later
        setTimeout(() => appWindow.setFocus(), 250);

        stopAudio();
        aiId.current++;
        setAi({ text: '', loading: false, error: '' });
        setProns([]);
        setSimilar([]);
        setSpeakError('');
        setSaved('');
        if (!clean) {
            // typed lookup: just wait for a word
            setWord('');
            setQuery('');
            setState({ idle: true });
            setShowHistory(true);
            setTimeout(() => inputRef.current?.focus(), 80);
            return;
        }
        setShowHistory(false);
        setWord(clean);
        setQuery(clean);
        setState(null);

        const list = listRef.current ?? ['ev_offline'];
        const key = keyOverride ?? (list.includes(curRef.current) ? curRef.current : list[0]);
        curRef.current = key;
        setCurrent(key);
        const service = dictionaryServices[getServiceName(key ?? 'ev_offline')];
        try {
            const entry = await service.lookup(clean, (await store.get(key)) ?? {});
            setState(entry ? { entry } : { missing: true });
            if (entry) {
                addHistory(entry.word || clean);
                if (entry.reverse) setProns([]);
                else if (entry.pron) setProns(entry.pron);
                else if (service.pronunciations) {
                    service
                        .pronunciations(entry.word || clean)
                        .then((p) => setProns(p.filter((x) => x.label === 'US')));
                }
            } else {
                // typos: similar words from the offline dictionary, when it is installed
                dictionaryServices.ev_offline
                    .suggest(clean)
                    .then((w) => setSimilar(w.filter((x) => x !== clean.toLowerCase())))
                    .catch(() => {});
            }
        } catch (e) {
            const msg = e?.message === 'NO_AI' ? t('dict.ai_no_service') : String(e?.message ?? e);
            setState(e?.message === 'NO_DATA' ? { noData: true } : { error: msg });
        }
    };

    useEffect(() => {
        if (serviceList === null) return;
        invoke('get_dict_text').then((x) => run(x));
        const unlisten = listen('dict_text', (e) => run(e.payload));
        return () => {
            unlisten.then((f) => f());
        };
    }, [serviceList === null]);

    // remember the size the user gives the popup
    useEffect(() => {
        let timer = null;
        const unlisten = appWindow.onResized(({ payload }) => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const size = payload.toLogical(await appWindow.scaleFactor());
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

    // ---- AI explanation (on demand) ---------------------------------------------------------------
    const explain = async () => {
        const id = ++aiId.current;
        setAi({ text: '', loading: true, error: '' });
        try {
            // The AI dictionary's own provider / API key (Services > Dictionary > AI dictionary)
            const cfg = await findAiDictConfig();
            const result = await runAi(cfg, word, 'explain', {
                stream: true,
                setResult: (v) => {
                    if (aiId.current === id) setAi({ text: String(v), loading: true, error: '' });
                },
            });
            if (aiId.current === id) setAi({ text: String(result ?? '').trim(), loading: false, error: '' });
        } catch (e) {
            const msg = e?.message === 'NO_AI' ? t('dict.ai_no_service') : String(e?.message ?? e);
            if (aiId.current === id) setAi({ text: '', loading: false, error: msg });
        }
    };

    // ---- audio ------------------------------------------------------------------------------------
    const playPron = async (p) => {
        const id = p.label || 'x';
        stopAudio();
        if (playing === id) {
            setPlaying('');
            return;
        }
        setPlaying(id);
        setSpeakError('');
        const done = () => setPlaying('');
        // 1) the recording, 2) the configured TTS service
        const useTts = p.label === 'US' && (await store.get('dict_us_tts')) === true;
        if (p.audio && !useTts) {
            try {
                await playAudio(await dictionaryServices.ev_offline.fetchAudio(p.audio), done);
                return;
            } catch (e) {
                console.error('dict audio failed', e);
                setSpeakError(t('dict.audio_fallback'));
            }
        }
        try {
            await playAudio(await synthesize(word), done);
        } catch (e) {
            setPlaying('');
            setSpeakError(String(e?.message ?? e));
        }
    };

    // ---- vocabulary book (Anki / Eudic ...) ---------------------------------------------------------
    const saveToVocab = async () => {
        const entry = state?.entry;
        if (!entry || entry.reverse) return;
        try {
            const keys = (await filterEnabled((await store.get('collection_service_list')) ?? [])).filter(
                (k) => collectionServices[getServiceName(k)]
            );
            if (!keys.length) {
                setSaved(t('dict.save_no_service'));
                return;
            }
            for (const k of keys) {
                await collectionServices[getServiceName(k)].collection(entry.word || word, entrySummary(entry), {
                    config: (await store.get(k)) ?? {},
                });
            }
            setSaved('ok');
            setTimeout(() => setSaved(''), 2500);
        } catch (e) {
            setSaved(String(e?.message ?? e));
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

    // ---- render -----------------------------------------------------------------------------------
    const entry = state?.entry;
    const canSave = entry && !entry.reverse;
    const activeKey = current ?? (serviceList ?? [])[0];
    return (
        <div className='dict-root bg-background text-foreground border-1 border-default-200'>
            <div
                className='dict-top'
                data-tauri-drag-region='true'
            >
                <form
                    className='dict-search'
                    onSubmit={(e) => {
                        e.preventDefault();
                        run(query);
                    }}
                >
                    <LuSearch />
                    <input
                        ref={inputRef}
                        value={query}
                        placeholder={t('dict.search')}
                        spellCheck={false}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </form>
                <button
                    className={`dict-icon-btn ${showHistory ? 'is-on' : ''}`}
                    title={t('dict.history')}
                    onClick={() => setShowHistory(!showHistory)}
                >
                    <LuHistory />
                </button>
                <button
                    className={`dict-icon-btn ${saved === 'ok' ? 'is-ok' : ''}`}
                    title={t('dict.save')}
                    disabled={!canSave}
                    onClick={saveToVocab}
                >
                    {saved === 'ok' ? <LuCheck /> : <LuStar />}
                </button>
                <Dropdown>
                    <DropdownTrigger>
                        <button className='dict-menu'>
                            <LuBookOpen />
                            <span>{menuTitle(activeKey)}</span>
                            <LuChevronDown />
                        </button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label='dictionary'
                        selectionMode='single'
                        selectedKeys={new Set([activeKey])}
                        onAction={(key) => {
                            setCurrent(key);
                            curRef.current = key;
                            if (word) run(word, key);
                        }}
                    >
                        {(serviceList ?? []).map((k) => (
                            <DropdownItem key={k}>{menuTitle(k)}</DropdownItem>
                        ))}
                    </DropdownMenu>
                </Dropdown>
                <button
                    className='dict-icon-btn'
                    onClick={() => appWindow.hide()}
                    title={t('common.cancel')}
                >
                    <LuX />
                </button>
            </div>

            <div className='dict-scroll'>
                {showHistory ? (
                    <HistoryPanel
                        filter={query === word ? '' : query}
                        onPick={(w) => run(w)}
                    />
                ) : (
                    <>
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

                        {saved && saved !== 'ok' && <div className='dict-note dict-error'>{saved}</div>}
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
                                                onClick={() => run(w)}
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
                            <ReverseList
                                entry={entry}
                                onPick={(w) => run(w)}
                            />
                        )}
                        {entry && <Meanings entry={entry} />}

                        {canSave && !ai.loading && !ai.text && !ai.error && (
                            <button
                                className='dict-ai-btn'
                                onClick={explain}
                            >
                                <LuSparkles /> {t('dict.ai_title')}
                            </button>
                        )}
                        {(ai.loading || ai.text || ai.error) && (
                            <div className='dict-ai'>
                                <div className='dict-ai-head'>
                                    <LuSparkles /> {t('dict.ai_title')}
                                    {ai.loading ? (
                                        <LuLoader2 className='dict-spin' />
                                    ) : (
                                        <button
                                            className='dict-link'
                                            onClick={explain}
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
                    </>
                )}
            </div>
        </div>
    );
}
