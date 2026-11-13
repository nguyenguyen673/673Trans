import { atom } from 'jotai';

// 'translate' (default) | 'polish' | 'summarize'
export const translateModeAtom = atom('translate');

// Services that are driven by a prompt (LLMs). Others can only translate.
const LLM_SERVICES = ['openai', 'openai_compatible', 'deepseek', 'chatglm', 'geminipro', 'ollama', 'claude'];

const SYSTEM = {
    polish: 'You are a professional editor. Polish the text: fix grammar, spelling and punctuation, improve clarity and fluency, keep the original language, meaning, tone and line breaks. Output only the polished text: no quotes, no notes, no explanations.',
    summarize:
        'You are a professional summarizer. Summarize the text concisely in $to, keeping the key points, names and numbers. Use short sentences or a few bullet points. Output only the summary: no quotes, no notes, no explanations.',
};
const USER = {
    polish: 'Polish this text:\n"""\n$text\n"""',
    summarize: 'Summarize into $to:\n"""\n$text\n"""',
};

export function modeSupported(serviceName, mode) {
    return mode === 'translate' || LLM_SERVICES.includes(serviceName);
}

// Returns the service config with the prompts replaced for the polish / summarize modes
export function applyMode(serviceName, config, mode) {
    if (mode === 'translate' || !LLM_SERVICES.includes(serviceName)) return config;
    const system = SYSTEM[mode];
    const user = USER[mode];
    const promptList =
        serviceName === 'geminipro'
            ? [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }]
            : [
                  { role: 'system', content: system },
                  { role: 'user', content: user },
              ];
    return { ...config, systemPrompt: system, userPrompt: user, promptList };
}
