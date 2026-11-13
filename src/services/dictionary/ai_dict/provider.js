// The AI dictionary has its own provider, API key and model (set in Services > Dictionary >
// AI dictionary). It does not use the translate list.
import { applyMode } from '../../../utils/translate_mode';
import { filterEnabled } from '../../../hooks/useEnabledList';
import { getServiceName } from '../../../utils/service_instance';
import * as translateServices from '../../translate';
import { store } from '../../../utils/store';

import { DEFAULT_REQUEST_PATH as DEEPSEEK_PATH, DEFAULT_MODEL as DEEPSEEK_MODEL } from '../../translate/deepseek';
import { DEFAULT_REQUEST_PATH as CLAUDE_PATH, DEFAULT_MODEL as CLAUDE_MODEL } from '../../translate/claude';

// `service` = which translate driver talks to the API (OpenAI-style chat, Claude, Gemini)
export const PROVIDERS = [
    {
        id: 'deepseek',
        service: 'deepseek',
        requestPath: DEEPSEEK_PATH,
        model: DEEPSEEK_MODEL,
        keyUrl: 'https://platform.deepseek.com/api_keys',
    },
    {
        id: 'openai',
        service: 'openai_compatible',
        requestPath: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-6-luna',
        keyUrl: 'https://platform.openai.com/api-keys',
    },
    {
        id: 'claude',
        service: 'claude',
        requestPath: CLAUDE_PATH,
        model: CLAUDE_MODEL,
        keyUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
        id: 'geminipro',
        service: 'geminipro',
        // the model is part of the URL
        requestPath: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest',
        model: '',
        noModel: true,
        keyUrl: 'https://aistudio.google.com/apikey',
    },
    { id: 'openai_compatible', service: 'openai_compatible', requestPath: '', model: '', keyUrl: '' },
];

export const DEFAULT_PROVIDER = 'deepseek';
export const getProvider = (id) => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];

export function defaultConfig(providerId = DEFAULT_PROVIDER) {
    const p = getProvider(providerId);
    return { provider: p.id, requestPath: p.requestPath, model: p.model, apiKey: '', timeout: 30000 };
}

// Run one request with the dictionary's own settings. mode: 'dict' (JSON entry) | 'explain' (text)
export async function runAi(cfg, word, mode, { stream = false, setResult = () => {} } = {}) {
    const p = getProvider(cfg?.provider);
    if (!cfg?.apiKey) throw new Error('NO_AI');
    const service = translateServices[p.service];
    const L = service.Language ?? {};
    const config = applyMode(
        p.service,
        {
            requestPath: cfg.requestPath || p.requestPath,
            model: cfg.model || p.model,
            apiKey: cfg.apiKey,
            timeout: cfg.timeout,
        },
        mode
    );
    return await service.translate(word, L.en ?? 'English', L.vi ?? 'Vietnamese', {
        config: { ...config, stream },
        detect: 'en',
        setResult,
    });
}

// Settings of the first enabled AI dictionary instance (null when there is none)
export async function findAiDictConfig() {
    const list = await filterEnabled(
        (await store.get('dictionary_service_list')) ?? ['ev_offline', 'wiktionary', 'ai_dict']
    );
    const key = list.find((k) => getServiceName(k) === 'ai_dict');
    return key ? ((await store.get(key)) ?? null) : null;
}
