import { useTranslation } from 'react-i18next';
import React from 'react';

import { LlmConfig } from '../../translate/_llm/LlmConfig';
import { DEFAULT_MODEL, DEFAULT_REQUEST_PATH, tts } from './index';

export function Config(props) {
    const { t } = useTranslation();
    return (
        <LlmConfig
            {...props}
            mode='tts'
            title={t('services.tts.elevenlabs_tts.title')}
            defaults={{ requestPath: DEFAULT_REQUEST_PATH, model: DEFAULT_MODEL, voice: '' }}
            keyUrl='https://elevenlabs.io/app/settings/api-keys'
            extraFields={[
                { key: 'voice', label: t('services.llm.voice'), desc: t('services.tts.elevenlabs_tts.voice_hint') },
            ]}
            // Speak one word with these settings before saving
            test={(config) => tts('hello', 'en', { config })}
        />
    );
}
