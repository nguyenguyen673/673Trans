import { atom } from 'jotai';

// 'translate' (default) | 'polish' | 'summarize'
export const translateModeAtom = atom('translate');

// Services that are driven by a prompt (LLMs). Others can only translate.
export const LLM_SERVICES = ['openai', 'openai_compatible', 'deepseek', 'chatglm', 'geminipro', 'ollama', 'claude'];

const SYSTEM = {
    polish: 'You are a professional editor. Polish the text: fix grammar, spelling and punctuation, improve clarity and fluency, keep the original language, meaning, tone and line breaks. Output only the polished text: no quotes, no notes, no explanations.',
    summarize:
        'You are a professional summarizer. Summarize the text concisely in $to, keeping the key points, names and numbers. Use short sentences or a few bullet points. Output only the summary: no quotes, no notes, no explanations.',
};
SYSTEM.explain =
    'You are an English-Vietnamese dictionary assistant. Explain the given English word or phrase in Vietnamese: the main meaning for each common part of speech, a short usage or nuance note if useful, and two short English example sentences each followed by its Vietnamese translation. Be concise. Plain text only: no markdown, no headings, no asterisks.';
SYSTEM.dict =
    'You are an English-Vietnamese dictionary. Reply with ONE raw JSON object only (no markdown, no code fences, no text around it) with this exact shape: {"word": string (the headword), "ipa": string (US IPA with slashes, e.g. "/həˈloʊ/"), "meanings": [{"pos": string (noun, verb, adjective, ...), "definitions": [string (short Vietnamese meaning)], "examples": [{"en": string, "vi": string}]}]}. Give the 1-4 most common parts of speech, 1-4 Vietnamese definitions each (most common first) and 1-2 short examples for each part of speech. If the input is a phrase or a different form of a word, explain that exact input.';
const USER = {
    dict: 'Word: """$text"""',
    polish: 'Polish this text:\n"""\n$text\n"""',
    explain: 'Explain the word/phrase:\n"""\n$text\n"""',
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
