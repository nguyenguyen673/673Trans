// DeepSeek: OpenAI compatible chat completions API
import { translate as openaiTranslate } from '../openai';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT, cleanResult } from '../_llm/prompt';

export const DEFAULT_REQUEST_PATH = 'https://api.deepseek.com/chat/completions';
export const DEFAULT_MODEL = 'deepseek-v4-flash';

export async function translate(text, from, to, options = {}) {
    const { config } = options;
    const result = await openaiTranslate(text, from, to, {
        ...options,
        config: {
            service: 'openai',
            requestPath: config.requestPath || DEFAULT_REQUEST_PATH,
            model: config.model || DEFAULT_MODEL,
            apiKey: config.apiKey,
            stream: config.stream ?? true,
            promptList: [
                { role: 'system', content: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
                { role: 'user', content: config.userPrompt ?? DEFAULT_USER_PROMPT },
            ],
            requestArguments: '{}',
        },
    });
    return typeof result === 'string' ? cleanResult(result) : result;
}

export * from './Config';
export * from './info';
