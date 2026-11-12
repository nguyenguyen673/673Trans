import { Language } from './languages';

export const DEFAULT_SYSTEM_PROMPT =
    'You are a professional translation engine. Translate the text into natural, fluent $to, keeping the tone, formatting and line breaks of the original. Output only the translation: no quotes, no notes, no explanations.';
export const DEFAULT_USER_PROMPT = 'Translate into $to:\n"""\n$text\n"""';

// $text $from $to $detect are replaced in the prompts
export function fillPrompt(template, text, from, to, detect) {
    return (template ?? '')
        .replaceAll('$text', text)
        .replaceAll('$from', from)
        .replaceAll('$to', to)
        .replaceAll('$detect', Language[detect] ?? '');
}

// LLMs like to wrap the answer in the same quotes the prompt used
export function cleanResult(result) {
    let target = (result ?? '').trim();
    if (target.startsWith('"""') && target.endsWith('"""') && target.length >= 6) {
        target = target.slice(3, -3);
    } else if (target.startsWith('"') && target.endsWith('"') && target.length >= 2) {
        target = target.slice(1, -1);
    }
    return target.trim();
}
