// OCR with a vision model: the screenshot is sent as an image, the model answers with the text
import { DEFAULT_OCR_PROMPT, postJson, requireKey } from '../../_ai/common';

export const DEFAULT_REQUEST_PATH = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_MODEL = 'gpt-6-luna';

export async function recognize(base64, language, options = {}) {
    const { config } = options;
    requireKey(config);
    if (!(config.requestPath || DEFAULT_REQUEST_PATH)) throw 'API URL is empty';
    const prompt = config.prompt || DEFAULT_OCR_PROMPT;
    const data = await postJson(
        config.requestPath || DEFAULT_REQUEST_PATH,
        { Authorization: `Bearer ${config.apiKey}` },
        {
            model: config.model || DEFAULT_MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
                    ],
                },
            ],
        },
        config
    );
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw JSON.stringify(data).slice(0, 600);
    return text.trim();
}

export * from './Config';
export * from './info';
