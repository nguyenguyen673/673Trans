// English -> Vietnamese offline dictionary (Ho Ngoc Duc, ~103,000 words).
// Data: dict/dict-data.json in the app config folder (Config > Services > Dictionary > edit > pick file).
// Format: { "word": { word, phonetic, meanings: [{ partOfSpeech, definitions: [], examples: [{ en, vi }] }] } }
import { BaseDirectory, exists, readTextFile } from '@tauri-apps/api/fs';
import { fetch, ResponseType } from '@tauri-apps/api/http';
import { HTTP_HEADERS } from '../common';

export const DATA_FILE = 'dict/dict-data.json';

let cache = null;

export async function dataFileExists() {
    return await exists(DATA_FILE, { dir: BaseDirectory.AppConfig });
}

export function resetCache() {
    cache = null;
}

async function load() {
    if (cache) return cache;
    if (!(await dataFileExists())) throw new Error('NO_DATA');
    cache = JSON.parse(await readTextFile(DATA_FILE, { dir: BaseDirectory.AppConfig }));
    return cache;
}

// Simple forms to try when the exact word is missing: cats -> cat, running -> run
function candidateKeys(word) {
    const w = word
        .trim()
        .toLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    const c = [w];
    if (w.endsWith('ies') && w.length > 4) c.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es') && w.length > 3) c.push(w.slice(0, -2));
    if (w.endsWith('s') && w.length > 2) c.push(w.slice(0, -1));
    if (w.endsWith('ing') && w.length > 5) {
        const b = w.slice(0, -3);
        c.push(b, b + 'e');
        if (b[b.length - 1] === b[b.length - 2]) c.push(b.slice(0, -1));
    }
    if (w.endsWith('ed') && w.length > 4) {
        const b = w.slice(0, -2);
        c.push(b, w.slice(0, -1));
        if (b[b.length - 1] === b[b.length - 2]) c.push(b.slice(0, -1));
    }
    if (w.endsWith('ly') && w.length > 4) c.push(w.slice(0, -2));
    return [...new Set(c)];
}

const VIET = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
const strip = (s) =>
    s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .toLowerCase();

// Vietnamese -> English: an index of every short Vietnamese gloss, built once per session
let reverseIndex = null;
function buildReverse(dict) {
    if (reverseIndex) return reverseIndex;
    const idx = new Map();
    for (const [word, entry] of Object.entries(dict)) {
        if (word.includes(' ') && word.length > 24) continue;
        for (const m of entry.meanings ?? []) {
            for (const def of m.definitions ?? []) {
                const gloss = def.replace(/\([^)]*\)/g, ' ');
                for (const part of gloss.split(/[,;]/)) {
                    const term = strip(part)
                        .replace(/[^a-z0-9 ]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (!term || term.length > 40) continue;
                    let arr = idx.get(term);
                    if (!arr) idx.set(term, (arr = []));
                    if (arr.length < 40 && !arr.some((x) => x.word === word)) arr.push({ word, gloss: def });
                }
            }
        }
    }
    reverseIndex = idx;
    return idx;
}

function reverseLookup(dict, text) {
    const q = strip(text)
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!q) return null;
    const idx = buildReverse(dict);
    const found = [];
    const seen = new Set();
    const add = (list, score) => {
        for (const x of list) {
            if (seen.has(x.word)) continue;
            seen.add(x.word);
            found.push({ ...x, score: score - x.word.length / 100 });
        }
    };
    if (idx.has(q)) add(idx.get(q), 3);
    if (found.length < 12) {
        for (const [term, list] of idx) {
            if (term.startsWith(q + ' ') || term.endsWith(' ' + q) || term.includes(' ' + q + ' ')) {
                add(list, 1);
                if (found.length >= 40) break;
            }
        }
    }
    if (!found.length) return null;
    found.sort((a, b) => b.score - a.score);
    return { word: text.trim(), reverse: found.slice(0, 15).map(({ word, gloss }) => ({ word, gloss })) };
}

// Similar words for a missing word (typos): same first letter, edit distance <= 2, or same prefix
function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        let min = i;
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (cur[j] < min) min = cur[j];
        }
        if (min > max) return max + 1;
        prev = cur;
    }
    return prev[b.length];
}

export async function suggest(text) {
    const dict = await load();
    const w = text.trim().toLowerCase();
    if (!w || VIET.test(w) || w.length < 2) return [];
    const max = w.length > 5 ? 2 : 1;
    const common = (k) => {
        let i = 0;
        while (i < k.length && i < w.length && k[i] === w[i]) i++;
        return i;
    };
    const out = [];
    for (const key of Object.keys(dict)) {
        if (key[0] !== w[0] || key.includes(' ')) continue;
        const d = distance(w, key, max);
        if (d <= max && key !== w) out.push({ key, d, c: common(key) });
    }
    out.sort((a, b) => a.d - b.d || b.c - a.c || Math.abs(a.key.length - w.length) - Math.abs(b.key.length - w.length));
    return out.slice(0, 8).map((x) => x.key);
}

// Returns { word, phonetic, meanings } (English word), { word, reverse: [{ word, gloss }] }
// (Vietnamese word), or null when nothing is found
export async function lookup(text) {
    const dict = await load();
    if (VIET.test(text)) return reverseLookup(dict, text);
    for (const key of candidateKeys(text)) {
        if (dict[key]) {
            const e = dict[key];
            // phonetic field can hold several variants: "a/ (b) /c" -> keep the first
            const phonetic = (e.phonetic ?? '').split('/')[0].trim();
            return { ...e, word: e.word || key, phonetic };
        }
    }
    // not English: maybe a Vietnamese word typed without accents
    return text.trim().includes(' ') ? null : reverseLookup(dict, text);
}

// Real IPA (UK / US) and recorded audio from the free dictionaryapi.dev (no key needed).
// Optional: returns [] when offline or when the word is unknown there.
const pronCache = new Map();
export async function pronunciations(word) {
    const key = word.trim().toLowerCase();
    if (pronCache.has(key)) return pronCache.get(key);
    let result = [];
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`, {
            method: 'GET',
            timeout: 5,
            responseType: ResponseType.JSON,
            headers: HTTP_HEADERS,
        });
        if (res.ok && Array.isArray(res.data)) {
            const seen = new Set();
            for (const entry of res.data) {
                for (const p of entry.phonetics ?? []) {
                    const audio = p.audio || '';
                    const label = /-uk\./.test(audio)
                        ? 'UK'
                        : /-us\./.test(audio)
                          ? 'US'
                          : /-au\./.test(audio)
                            ? 'AU'
                            : '';
                    const ipa = p.text || '';
                    if (!ipa && !audio) continue;
                    const k = `${label}|${ipa}|${audio}`;
                    if (seen.has(k)) continue;
                    seen.add(k);
                    result.push({ label, ipa, audio });
                }
            }
            // keep one entry per accent; prefer ones with both IPA and audio
            const best = {};
            for (const r of result) {
                const g = r.label || 'other';
                const score = (r.ipa ? 1 : 0) + (r.audio ? 1 : 0);
                if (!best[g] || score > best[g].score) best[g] = { ...r, score };
            }
            result = ['UK', 'US', 'AU', 'other'].filter((g) => best[g]).map((g) => best[g]);
            // the unlabeled one is only useful if there is nothing else
            if (result.length > 1) result = result.filter((r) => r.label);
        }
    } catch {}
    pronCache.set(key, result);
    return result;
}

export async function fetchAudio(url) {
    // Wikimedia refuses requests without a User-Agent (HTTP 403)
    const res = await fetch(url, {
        method: 'GET',
        timeout: 4,
        responseType: ResponseType.Binary,
        headers: HTTP_HEADERS,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.data;
}

export * from './Config';
export * from './info';
