import { useTranslation } from 'react-i18next';
import React from 'react';

import { LlmConfig } from '../../translate/_llm/LlmConfig';
import { DEFAULT_OCR_PROMPT, requireKey } from '../../_ai/common';
import { DEFAULT_MODEL, DEFAULT_REQUEST_PATH } from './index';

export function Config(props) {
    const { t } = useTranslation();
    return (
        <LlmConfig
            {...props}
            mode='ocr'
            title={t('services.recognize.gemini_ocr.title')}
            defaults={{ requestPath: DEFAULT_REQUEST_PATH, model: DEFAULT_MODEL, prompt: DEFAULT_OCR_PROMPT }}
            keyUrl='https://aistudio.google.com/apikey'
            modelHint={t('services.llm.vision_model_hint')}
            // No test request here (it would need a real image): only check the key is filled in
            test={async (config) => requireKey(config)}
        />
    );
}
