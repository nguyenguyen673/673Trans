// OCR with a vision model: the screenshot is sent as an image, the model answers with the text
import { DEFAULT_OCR_PROMPT, postJson, requireKey } from '../../_ai/common';

export const DEFAULT_REQUEST_PATH = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_MODEL = 'gemini-flash-latest';

export async function recognize(base64, language, options = {}) {
    const { config } = options;
    requireKey(config);
    if (!(config.requestPath || DEFAULT_REQUEST_PATH)) throw 'API URL is empty';
    const prompt = config.prompt || DEFAULT_OCR_PROMPT;
    const base = (config.requestPath || DEFAULT_REQUEST_PATH).replace(/\/$/, '');
    const data = await postJson(
        `${base}/models/${config.model || DEFAULT_MODEL}:generateContent`,
        { 'x-goog-api-key': config.apiKey },
        {
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/png', data: base64 } }] }],
        },
        config
    );
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('');
    if (typeof text !== 'string') throw JSON.stringify(data).slice(0, 600);
    return text.trim();
}

export * from './Config';
export * from './info';
