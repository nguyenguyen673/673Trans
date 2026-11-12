// ElevenLabs text to speech
import { postForBytes, requireKey } from '../../_ai/common';

export const DEFAULT_REQUEST_PATH = 'https://api.elevenlabs.io/v1/text-to-speech';
export const DEFAULT_MODEL = 'eleven_v3';

export async function tts(text, lang, options = {}) {
    const { config } = options;
    requireKey(config);
    if (!config.voice) throw 'Voice ID is empty';
    const base = (config.requestPath || DEFAULT_REQUEST_PATH).replace(/\/$/, '');
    return await postForBytes(
        `${base}/${encodeURIComponent(config.voice)}`,
        { 'xi-api-key': config.apiKey },
        { text, model_id: config.model || DEFAULT_MODEL },
        config,
        { output_format: 'mp3_44100_128' }
    );
}

export * from './Config';
export * from './info';
