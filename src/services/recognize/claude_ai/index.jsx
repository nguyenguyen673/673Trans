// OCR with a vision model: the screenshot is sent as an image, the model answers with the text
import { DEFAULT_OCR_PROMPT, postJson, requireKey } from '../../_ai/common';

export const DEFAULT_REQUEST_PATH = 'https://api.anthropic.com/v1/messages';
export const DEFAULT_MODEL = 'claude-haiku-5-5';

export async function recognize(base64, language, options = {}) {
    const { config } = options;
    requireKey(config);
    if (!(config.requestPath || DEFAULT_REQUEST_PATH)) throw 'API URL is empty';
    const prompt = config.prompt || DEFAULT_OCR_PROMPT;
    const data = await postJson(
        config.requestPath || DEFAULT_REQUEST_PATH,
        { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
        {
            model: config.model || DEFAULT_MODEL,
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
                        { type: 'text', text: prompt },
                    ],
                },
            ],
        },
        config
    );
    const text = (data?.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
    if (typeof text !== 'string') throw JSON.stringify(data).slice(0, 600);
    return text.trim();
}

export * from './Config';
export * from './info';
