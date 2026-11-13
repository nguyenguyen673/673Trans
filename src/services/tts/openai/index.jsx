// OpenAI text to speech (also works with compatible servers: change the API URL)
import { postForBytes, requireKey } from '../../_ai/common';

export const DEFAULT_REQUEST_PATH = 'https://api.openai.com/v1/audio/speech';
export const DEFAULT_MODEL = 'gpt-4o-mini-tts';
export const DEFAULT_VOICE = 'alloy';

export async function tts(text, lang, options = {}) {
    const { config } = options;
    requireKey(config);
    return await postForBytes(
        config.requestPath || DEFAULT_REQUEST_PATH,
        { Authorization: `Bearer ${config.apiKey}` },
        {
            model: config.model || DEFAULT_MODEL,
            voice: config.voice || DEFAULT_VOICE,
            input: text,
            response_format: 'mp3',
        },
        config
    );
}

export * from './Config';
export * from './info';
