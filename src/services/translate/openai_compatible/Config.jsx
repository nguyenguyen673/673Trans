import { useTranslation } from 'react-i18next';
import React from 'react';

import { LlmConfig } from '../_llm/LlmConfig';
import { translate } from './index';

export function Config(props) {
    const { t } = useTranslation();
    return (
        <LlmConfig
            {...props}
            title={t('services.translate.openai_compatible.title')}
            translate={translate}
            defaults={{ requestPath: '', model: '' }}
            requestPathHint={t('services.translate.openai_compatible.request_path_hint')}
            modelHint={t('services.translate.openai_compatible.model_hint')}
        />
    );
}
