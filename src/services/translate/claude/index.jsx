// Claude: Anthropic Messages API (https://docs.claude.com)
import { fetch, Body } from '@tauri-apps/api/http';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT, fillPrompt, cleanResult } from '../_llm/prompt';

export const DEFAULT_REQUEST_PATH = 'https://api.anthropic.com/v1/messages';
export const DEFAULT_MODEL = 'claude-haiku-5-5';

export async function translate(text, from, to, options = {}) {
    const { config, detect } = options;
    let requestPath = config.requestPath || DEFAULT_REQUEST_PATH;
    if (!/https?:\/\/.+/.test(requestPath)) {
        requestPath = `https://${requestPath}`;
    }

    const res = await fetch(requestPath, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: Body.json({
            model: config.model || DEFAULT_MODEL,
            max_tokens: 4096,
            system: fillPrompt(config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT, text, from, to, detect),
            messages: [
                {
                    role: 'user',
                    content: fillPrompt(config.userPrompt ?? DEFAULT_USER_PROMPT, text, from, to, detect),
                },
            ],
        }),
    });

    if (!res.ok) {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }
    const blocks = res.data?.content;
    const target = Array.isArray(blocks)
        ? blocks
              .filter((block) => block.type === 'text')
              .map((block) => block.text)
              .join('')
        : '';
    if (target.trim() === '') {
        throw JSON.stringify(res.data);
    }
    return cleanResult(target);
}

export * from './Config';
export * from './info';
