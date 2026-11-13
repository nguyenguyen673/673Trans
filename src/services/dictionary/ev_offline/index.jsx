// English -> Vietnamese offline dictionary (Ho Ngoc Duc, ~103,000 words).
// Data: dict/dict-data.json in the app config folder (Config > Services > Dictionary > edit > pick file).
// Format: { "word": { word, phonetic, meanings: [{ partOfSpeech, definitions: [], examples: [{ en, vi }] }] } }
import { BaseDirectory, exists, readTextFile } from '@tauri-apps/api/fs';

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
    if (w.endsWith('ing') && w.length > 5) c.push(w.slice(0, -3), w.slice(0, -3) + 'e');
    if (w.endsWith('ed') && w.length > 4) c.push(w.slice(0, -2), w.slice(0, -1));
    if (w.endsWith('ly') && w.length > 4) c.push(w.slice(0, -2));
    return [...new Set(c)];
}

// Returns { word, phonetic, meanings } or null when the word is not in the dictionary
export async function lookup(text) {
    const dict = await load();
    for (const key of candidateKeys(text)) {
        if (dict[key]) return { ...dict[key], word: dict[key].word || key };
    }
    return null;
}

export * from './Config';
export * from './info';
