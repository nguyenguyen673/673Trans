// English -> Vietnamese offline dictionary (Ho Ngoc Duc, ~103,000 words).
// Data: dict/dict-data.json in the app config folder (Config > Services > Dictionary > edit > pick file).
// Format: { "word": { word, phonetic, meanings: [{ partOfSpeech, definitions: [], examples: [{ en, vi }] }] } }
import { BaseDirectory, exists, readTextFile } from '@tauri-apps/api/fs';
import { fetch, ResponseType } from '@tauri-apps/api/http';

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

// Returns { word, phonetic, meanings } or null when the word is not in the dictionary
export async function lookup(text) {
    const dict = await load();
    for (const key of candidateKeys(text)) {
        if (dict[key]) {
            const e = dict[key];
            // phonetic field can hold several variants: "a/ (b) /c" -> keep the first
            const phonetic = (e.phonetic ?? '').split('/')[0].trim();
            return { ...e, word: e.word || key, phonetic };
        }
    }
    return null;
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
    const res = await fetch(url, { method: 'GET', timeout: 10, responseType: ResponseType.Binary });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.data;
}

export * from './Config';
export * from './info';
