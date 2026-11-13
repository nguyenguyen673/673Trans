// Helpers shared by the AI based OCR and TTS services
import { fetch, Body, ResponseType } from '@tauri-apps/api/http';

export const DEFAULT_OCR_PROMPT =
    'Extract all the text in this image exactly as written, keeping line breaks and reading order. Output only the text: no comments, no markdown fences. If there is no text, output nothing.';

export const timeoutSeconds = (config) => (config.timeout ? Math.ceil(config.timeout / 1000) : undefined);

export function withHttps(url) {
    return /^https?:\/\/.+/.test(url) ? url : `https://${url}`;
}

function describe(data) {
    if (Array.isArray(data)) {
        try {
            return new TextDecoder().decode(new Uint8Array(data)).slice(0, 600);
        } catch {
            return '';
        }
    }
    return JSON.stringify(data ?? '').slice(0, 600);
}

export function httpError(res) {
    return `Http Request Error\nHttp Status: ${res.status}\n${describe(res.data)}`;
}

// POST JSON, get JSON back
export async function postJson(url, headers, body, config) {
    const res = await fetch(withHttps(url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: Body.json(body),
        timeout: timeoutSeconds(config),
    });
    if (!res.ok) throw httpError(res);
    return res.data;
}

// POST JSON, get raw bytes back (audio)
export async function postForBytes(url, headers, body, config, query) {
    const res = await fetch(withHttps(url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: Body.json(body),
        query,
        responseType: ResponseType.Binary,
        timeout: timeoutSeconds(config),
    });
    if (!res.ok) throw httpError(res);
    return res.data;
}

export function requireKey(config) {
    if (!config.apiKey) throw 'API key is empty';
}

// Raw 16 bit mono PCM -> WAV file bytes (what the audio player can decode)
export function pcmToWav(pcm, sampleRate = 24000) {
    const header = new DataView(new ArrayBuffer(44));
    const text = (offset, value) => [...value].forEach((c, i) => header.setUint8(offset + i, c.charCodeAt(0)));
    text(0, 'RIFF');
    header.setUint32(4, 36 + pcm.length, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    header.setUint32(16, 16, true);
    header.setUint16(20, 1, true);
    header.setUint16(22, 1, true);
    header.setUint32(24, sampleRate, true);
    header.setUint32(28, sampleRate * 2, true);
    header.setUint16(32, 2, true);
    header.setUint16(34, 16, true);
    text(36, 'data');
    header.setUint32(40, pcm.length, true);
    const wav = new Uint8Array(44 + pcm.length);
    wav.set(new Uint8Array(header.buffer), 0);
    wav.set(pcm, 44);
    return wav;
}

export function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
