// English dictionary from Wiktionary (via kaikki.org), Cambridge style:
// UK / US IPA with recorded audio, English definitions and example sentences.
// Online, one small request per word, no key needed.
import { fetch, ResponseType } from '@tauri-apps/api/http';
import { HTTP_HEADERS } from '../common';

import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';

const cache = new Map();

function candidates(word) {
    const w = word
        .trim()
        .toLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
        .replace(/\s+/g, '_');
    return [w];
}

async function fetchEntries(w) {
    if (cache.has(w)) return cache.get(w);
    const url = `https://kaikki.org/dictionary/English/meaning/${w[0]}/${w.slice(0, 2)}/${encodeURIComponent(w)}.jsonl`;
    const res = await fetch(url, {
        method: 'GET',
        timeout: 15,
        responseType: ResponseType.Text,
        headers: HTTP_HEADERS,
    });
    let entries = [];
    if (res.ok) {
        entries = String(res.data)
            .split('\n')
            .filter((l) => l.trim())
            .map((l) => {
                try {
                    return JSON.parse(l);
                } catch {
                    return null;
                }
            })
            .filter((e) => e && e.word && e.lang_code === 'en');
    } else if (res.status !== 404) {
        throw new Error(`Wiktionary: HTTP ${res.status}`);
    }
    cache.set(w, entries);
    return entries;
}

function tagsOf(s) {
    return (s.tags ?? []).join(' ');
}

function buildPron(entries) {
    const out = { UK: { label: 'UK' }, US: { label: 'US' } };
    for (const e of entries) {
        for (const s of e.sounds ?? []) {
            const tg = tagsOf(s);
            const uk = /\bUK\b|Received-Pronunciation/.test(tg) || /en-uk/i.test(s.audio ?? '');
            const us = /\bUS\b|General-American/.test(tg) || /en-us/i.test(s.audio ?? '');
            const target = uk ? out.UK : us ? out.US : null;
            if (!target) continue;
            if (s.ipa && !target.ipa && /[^\-\s/]/.test(s.ipa.replace(/[/\-]/g, ''))) {
                // skip fragments such as "/hə-/"
                if (!/-\//.test(s.ipa) && !/\/-/.test(s.ipa)) target.ipa = s.ipa;
            }
            if (s.mp3_url && !target.audio) target.audio = s.mp3_url;
        }
    }
    return [out.UK, out.US].filter((p) => p.ipa || p.audio);
}

function buildMeanings(entries) {
    const byPos = new Map();
    for (const e of entries) {
        const senses = [];
        for (const s of e.senses ?? []) {
            if (s.form_of || s.alt_of || !(s.glosses ?? []).length) continue;
            const gloss = s.glosses[s.glosses.length - 1];
            const examples = (s.examples ?? [])
                .filter((x) => x.text && x.type !== 'quotation')
                .map((x) => x.text)
                .slice(0, 2);
            senses.push({ gloss, examples });
        }
        if (!senses.length) continue;
        const pos = e.pos ?? '';
        if (!byPos.has(pos)) byPos.set(pos, []);
        byPos.get(pos).push(...senses);
    }
    return [...byPos.entries()].map(([partOfSpeech, senses]) => ({ partOfSpeech, senses: senses.slice(0, 8) }));
}

// Parsed results are kept on disk (dict/wiktionary/<word>.json): instant and offline next time
const CACHE_DIR = 'dict/wiktionary';
const cachePath = (w) => `${CACHE_DIR}/${w.replace(/[^a-z0-9_-]/g, (c) => '%' + c.charCodeAt(0).toString(16))}.json`;

async function readCache(w) {
    try {
        const p = cachePath(w);
        if (await exists(p, { dir: BaseDirectory.AppConfig })) {
            return JSON.parse(await readTextFile(p, { dir: BaseDirectory.AppConfig }));
        }
    } catch {}
    return null;
}

async function writeCache(w, value) {
    try {
        await createDir(CACHE_DIR, { dir: BaseDirectory.AppConfig, recursive: true });
        await writeTextFile(cachePath(w), JSON.stringify(value), { dir: BaseDirectory.AppConfig });
    } catch {}
}

export async function lookup(text) {
    const w0 = candidates(text)[0];
    if (w0) {
        const hit = await readCache(w0);
        if (hit) return hit;
    }
    const result = await lookupOnline(text);
    if (result && w0) writeCache(w0, result);
    return result;
}

async function lookupOnline(text) {
    for (const w of candidates(text)) {
        if (!w) continue;
        let entries = await fetchEntries(w);
        if (!entries.length) continue;
        // "offers" only has form-of senses -> follow to the lemma ("offer")
        const onlyForms = entries.every((e) => (e.senses ?? []).every((s) => s.form_of));
        if (onlyForms) {
            const lemma = entries[0].senses?.[0]?.form_of?.[0]?.word;
            if (lemma && lemma !== w) {
                const l = (await fetchEntries(lemma.toLowerCase().replace(/\s+/g, '_'))) ?? [];
                if (l.length) entries = l;
            }
        }
        const meanings = buildMeanings(entries);
        if (!meanings.length) continue;
        return { word: entries[0].word, pron: buildPron(entries), meanings };
    }
    return null;
}

export * from './Config';
export * from './info';
