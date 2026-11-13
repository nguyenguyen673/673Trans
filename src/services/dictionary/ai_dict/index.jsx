// Dictionary entries written by one of your AI translate services (DeepSeek, Claude, Gemini, ...):
// Vietnamese meanings, parts of speech and examples. Needs an AI service in the translate list.
import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';

import { applyMode, LLM_SERVICES } from '../../../utils/translate_mode';
import { filterEnabled } from '../../../hooks/useEnabledList';
import { getServiceName } from '../../../utils/service_instance';
import * as translateServices from '../../translate';
import { store } from '../../../utils/store';

const CACHE_DIR = 'dict/ai';
const safe = (w) => w.replace(/[^a-z0-9_-]/g, (c) => '%' + c.charCodeAt(0).toString(16));

async function pickService(config) {
    const list = await filterEnabled((await store.get('translate_service_list')) ?? []);
    const ai = list.filter((k) => LLM_SERVICES.includes(getServiceName(k)));
    if (config?.aiService && ai.includes(config.aiService)) return config.aiService;
    if (!ai.length) throw new Error('NO_AI');
    return ai[0];
}

function parseJson(text) {
    let t = String(text ?? '').trim();
    t = t
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/, '')
        .trim();
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('Bad AI answer');
    return JSON.parse(t.slice(a, b + 1));
}

export async function lookup(text, instanceConfig) {
    const word = text.trim();
    if (!word) return null;
    const key = safe(word.toLowerCase());
    const path = `${CACHE_DIR}/${key}.json`;
    try {
        if (await exists(path, { dir: BaseDirectory.AppConfig })) {
            return JSON.parse(await readTextFile(path, { dir: BaseDirectory.AppConfig }));
        }
    } catch {}

    const instanceKey = await pickService(instanceConfig);
    const name = getServiceName(instanceKey);
    const service = translateServices[name];
    const L = service.Language ?? {};
    const config = applyMode(name, (await store.get(instanceKey)) ?? {}, 'dict');
    const raw = await service.translate(word, L.en ?? 'English', L.vi ?? 'Vietnamese', {
        config: { ...config, stream: false },
        detect: 'en',
        setResult: () => {},
    });
    const data = parseJson(raw);
    const meanings = (data.meanings ?? [])
        .map((m) => ({
            partOfSpeech: m.pos ?? '',
            definitions: (m.definitions ?? []).map(String),
            examples: (m.examples ?? []).filter((e) => e && e.en),
        }))
        .filter((m) => m.definitions.length);
    if (!meanings.length) return null;
    const ipa = (data.ipa ?? '').trim();
    const entry = {
        word: data.word || word,
        phonetic: '',
        // no recording: the speaker button reads the word with your TTS service
        pron: [{ label: 'US', ipa, audio: '' }],
        meanings,
    };
    try {
        await createDir(CACHE_DIR, { dir: BaseDirectory.AppConfig, recursive: true });
        await writeTextFile(path, JSON.stringify(entry), { dir: BaseDirectory.AppConfig });
    } catch {}
    return entry;
}

export * from './Config';
export * from './info';
