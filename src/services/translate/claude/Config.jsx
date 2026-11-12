import { useTranslation } from 'react-i18next';
import React from 'react';

import { translate, DEFAULT_MODEL, DEFAULT_REQUEST_PATH } from './index';
import { LlmConfig } from '../_llm/LlmConfig';

export function Config(props) {
    const { t } = useTranslation();
    return (
        <LlmConfig
            {...props}
            title={t('services.translate.claude.title')}
            translate={translate}
            defaults={{ requestPath: DEFAULT_REQUEST_PATH, model: DEFAULT_MODEL }}
            keyUrl='https://console.anthropic.com/settings/keys'
            modelHint={t('services.translate.claude.model_hint')}
            supportsStream={false}
        />
    );
}
