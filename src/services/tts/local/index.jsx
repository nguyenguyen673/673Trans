// Local TTS. Edge neural voices are built into the app (no server, no Python).
// If your own tts_server.py answers (Piper offline, real-voice word pack) it is used first,
// and `engine: piper` starts it hidden from `serverDir`.
import { fetch, Body, ResponseType } from '@tauri-apps/api/http';
import { invoke } from '@tauri-apps/api';

export const DEFAULTS = {
    serverUrl: 'http://127.0.0.1:5052',
    serverDir: '',
    autoStart: true,
    engine: 'edge',
    edgeEnVoice: 'en-US-AriaNeural',
    edgeViVoice: 'vi-VN-HoaiMyNeural',
    enVoice: 'en_US-lessac-medium',
    viVoice: 'vi_VN-vais1000-medium',
    speed: '1.0',
    useWordPack: 'yes',
    maxWords: '3',
};

const base = (config) => (config.serverUrl || DEFAULTS.serverUrl).replace(/\/+$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function healthy(url) {
    try {
        const res = await fetch(`${url}/health`, { method: 'GET', timeout: 2 });
        return res.ok;
    } catch {
        return false;
    }
}

// Make sure the server answers; start it if allowed
export async function ensureServer(config) {
    const url = base(config);
    if (await healthy(url)) return;
    if (config.autoStart === false) {
        throw `Không kết nối được Local TTS server (${url}). Hãy chạy run_server.bat.`;
    }
    try {
        await invoke('local_tts_start', { dir: config.serverDir || DEFAULTS.serverDir });
    } catch (e) {
        throw `Không kết nối được Local TTS server (${url}) và không tự bật được: ${e}`;
    }
    // Piper loads its voices on start: allow up to ~30 s
    for (let i = 0; i < 30; i++) {
        await sleep(1000);
        if (await healthy(url)) return;
    }
    throw `Đã thử bật Local TTS server nhưng ${url} vẫn chưa trả lời. Xem server.log trong thư mục server.`;
}

const VI_CHARS = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

// Built-in Edge voices through the Rust command
async function edgeBuiltin(text, lang, config) {
    const vi = lang === 'vi' || (lang !== 'en' && VI_CHARS.test(text));
    const voice = vi ? config.edgeViVoice : config.edgeEnVoice;
    const rate = Math.round(((Number(config.speed) || 1.0) - 1) * 100);
    return await invoke('edge_tts', { text, voice, rate });
}

export async function tts(text, lang, options = {}) {
    const config = { ...DEFAULTS, ...(options.config ?? {}) };
    // Your own server first when it is running; otherwise Edge is built in
    if (config.engine === 'edge' && !(await healthy(base(config)))) {
        return await edgeBuiltin(text, lang, config);
    }
    await ensureServer(config);
    const res = await fetch(`${base(config)}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Body.json({
            text,
            lang: lang || 'auto',
            engine: config.engine,
            edgeEnVoice: config.edgeEnVoice,
            edgeViVoice: config.edgeViVoice,
            enVoice: config.enVoice,
            viVoice: config.viVoice,
            speed: Number(config.speed) || 1.0,
            useWordPack: config.useWordPack,
            maxWords: Number(config.maxWords) || 3,
        }),
        responseType: ResponseType.Binary,
        timeout: Math.ceil((config.timeout || 60000) / 1000),
    });
    if (!res.ok) {
        let msg = '';
        try {
            msg = new TextDecoder().decode(new Uint8Array(res.data));
        } catch {}
        throw `Local TTS lỗi ${res.status}: ${msg.slice(0, 400)}`;
    }
    return res.data;
}

export * from './Config';
export * from './info';
