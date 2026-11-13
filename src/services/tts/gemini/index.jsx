// Gemini text to speech: the API answers with raw PCM audio, wrapped here into a WAV file
import { postJson, requireKey, pcmToWav, base64ToBytes } from '../../_ai/common';

export const DEFAULT_REQUEST_PATH = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
export const DEFAULT_VOICE = 'Kore';

export async function tts(text, lang, options = {}) {
    const { config } = options;
    requireKey(config);
    const base = (config.requestPath || DEFAULT_REQUEST_PATH).replace(/\/$/, '');
    const data = await postJson(
        `${base}/models/${config.model || DEFAULT_MODEL}:generateContent`,
        { 'x-goog-api-key': config.apiKey },
        {
            contents: [{ parts: [{ text }] }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice || DEFAULT_VOICE } },
                },
            },
        },
        config
    );
    const part = (data?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
    if (!part) throw JSON.stringify(data).slice(0, 600);
    const rate = parseInt(/rate=(\d+)/.exec(part.inlineData.mimeType ?? '')?.[1] ?? '24000');
    return pcmToWav(base64ToBytes(part.inlineData.data), rate);
}

export * from './Config';
export * from './info';
