import { useTranslation } from 'react-i18next';
import React from 'react';

import { LlmConfig } from '../../translate/_llm/LlmConfig';
import { DEFAULT_MODEL, DEFAULT_REQUEST_PATH, DEFAULT_VOICE, tts } from './index';

export function Config(props) {
    const { t } = useTranslation();
    return (
        <LlmConfig
            {...props}
            mode='tts'
            title={t('services.tts.gemini_tts.title')}
            defaults={{ requestPath: DEFAULT_REQUEST_PATH, model: DEFAULT_MODEL, voice: DEFAULT_VOICE }}
            keyUrl='https://aistudio.google.com/apikey'
            extraFields={[
                { key: 'voice', label: t('services.llm.voice'), desc: t('services.tts.gemini_tts.voice_hint') },
            ]}
            // Speak one word with these settings before saving
            test={(config) => tts('hello', 'en', { config })}
        />
    );
}
