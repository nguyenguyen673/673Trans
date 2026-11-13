// Lookup history of the dictionary popup: AppConfig/dict/history.json = [{ w, t }] newest first
import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';

const DIR = 'dict';
const FILE = 'dict/history.json';
const MAX = 1000;

export async function loadHistory() {
    try {
        if (await exists(FILE, { dir: BaseDirectory.AppConfig })) {
            const list = JSON.parse(await readTextFile(FILE, { dir: BaseDirectory.AppConfig }));
            return Array.isArray(list) ? list : [];
        }
    } catch {}
    return [];
}

async function save(list) {
    try {
        await createDir(DIR, { dir: BaseDirectory.AppConfig, recursive: true });
        await writeTextFile(FILE, JSON.stringify(list), { dir: BaseDirectory.AppConfig });
    } catch {}
}

// Looking the same word up again moves it to the top
export async function addHistory(word) {
    const w = (word ?? '').trim();
    if (!w) return;
    const list = (await loadHistory()).filter((x) => x.w.toLowerCase() !== w.toLowerCase());
    list.unshift({ w, t: Date.now() });
    await save(list.slice(0, MAX));
}

export async function removeHistory(word) {
    await save((await loadHistory()).filter((x) => x.w !== word));
}

export async function clearHistory() {
    await save([]);
}
