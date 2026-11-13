// Any provider with an OpenAI compatible chat completions API
// (OpenRouter, SiliconFlow, Qwen, Kimi, LM Studio, ...). URL and model are typed by the user.
import { translate as openaiTranslate } from '../openai';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT, cleanResult } from '../_llm/prompt';

export async function translate(text, from, to, options = {}) {
    const { config } = options;
    if (!config.requestPath) {
        throw 'API URL is empty';
    }
    const result = await openaiTranslate(text, from, to, {
        ...options,
        config: {
            service: 'openai',
            requestPath: config.requestPath,
            model: config.model,
            apiKey: config.apiKey,
            stream: config.stream ?? true,
            promptList: [
                { role: 'system', content: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
                { role: 'user', content: config.userPrompt ?? DEFAULT_USER_PROMPT },
            ],
            requestArguments: '{}',
            timeout: config.timeout,
        },
    });
    return typeof result === 'string' ? cleanResult(result) : result;
}

export * from './Config';
export * from './info';
