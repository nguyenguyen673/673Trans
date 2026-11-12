// Shared settings form for LLM based translators (DeepSeek, Claude, OpenAI compatible...).
// To add another provider: copy src/services/translate/deepseek, change the
// defaults, then register it in src/services/translate/index.jsx,
// src-tauri/src/config.rs (builtin_translate_list) and the i18n files.
import { Input, Button, Switch, Textarea } from '@nextui-org/react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/api/shell';
import React, { useState } from 'react';

import { INSTANCE_NAME_CONFIG_KEY } from '../../../utils/service_instance';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT } from './prompt';
import { useConfig } from '../../../hooks/useConfig';
import { useToastStyle } from '../../../hooks';
import { Language } from './languages';

const DEFAULT_TIMEOUT = 30000;

// One row: label (+ small description) on the left, control on the right
function Field({ label, desc, children }) {
    return (
        <div className='config-item'>
            <div className='config-label'>
                <h3>{label}</h3>
                {desc && <p className='config-desc'>{desc}</p>}
            </div>
            <div className='llm-field-control'>{children}</div>
        </div>
    );
}

function Group({ title, children }) {
    return (
        <>
            <h4 className='config-section-title'>{title}</h4>
            <div className='llm-group'>{children}</div>
        </>
    );
}

export function LlmConfig(props) {
    const {
        instanceKey,
        updateServiceList,
        onClose,
        // provider specific
        title,
        translate,
        defaults,
        keyUrl,
        modelHint,
        requestPathHint,
        supportsStream = true,
    } = props;
    const { t } = useTranslation();
    const [config, setConfig] = useConfig(
        instanceKey,
        {
            [INSTANCE_NAME_CONFIG_KEY]: title,
            apiKey: '',
            stream: supportsStream,
            timeout: DEFAULT_TIMEOUT,
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            userPrompt: DEFAULT_USER_PROMPT,
            ...defaults,
        },
        { sync: false }
    );
    const [isLoading, setIsLoading] = useState(false);
    const toastStyle = useToastStyle();
    const set = (key, value) => setConfig({ ...config, [key]: value });

    return (
        config !== null && (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setIsLoading(true);
                    // Test with one real request before saving
                    translate('hello', Language.auto, Language.vi, { config: { ...config, stream: false } }).then(
                        () => {
                            setIsLoading(false);
                            setConfig(config, true);
                            updateServiceList(instanceKey);
                            onClose();
                        },
                        (e) => {
                            setIsLoading(false);
                            toast.error(t('config.service.test_failed') + ': ' + e.toString(), { style: toastStyle });
                        }
                    );
                }}
            >
                <Toaster />
                <Group title={t('services.llm.general')}>
                    <Field label={t('config.service.service_name')}>
                        <Input
                            aria-label='name'
                            value={config[INSTANCE_NAME_CONFIG_KEY]}
                            variant='bordered'
                            onValueChange={(v) => set(INSTANCE_NAME_CONFIG_KEY, v)}
                        />
                    </Field>
                    <Field
                        label={t('services.llm.timeout')}
                        desc={t('services.llm.timeout_desc')}
                    >
                        <Input
                            aria-label='timeout'
                            type='number'
                            min={1000}
                            step={1000}
                            value={String(config.timeout ?? DEFAULT_TIMEOUT)}
                            variant='bordered'
                            endContent={<span className='text-default-500 text-[12px]'>ms</span>}
                            onValueChange={(v) => set('timeout', parseInt(v) || DEFAULT_TIMEOUT)}
                        />
                    </Field>
                </Group>

                <Group title={title}>
                    <Field
                        label={t('services.llm.request_path')}
                        desc={requestPathHint ?? t('services.llm.request_path_desc')}
                    >
                        <Input
                            aria-label='url'
                            value={config.requestPath}
                            variant='bordered'
                            onValueChange={(v) => set('requestPath', v)}
                        />
                    </Field>
                    <Field
                        label={t('services.llm.api_key')}
                        desc={
                            <>
                                {t('services.llm.api_key_desc')}{' '}
                                {keyUrl && (
                                    <a
                                        className='text-primary cursor-pointer underline'
                                        onClick={() => open(keyUrl)}
                                    >
                                        {t('services.llm.get_key')}
                                    </a>
                                )}
                            </>
                        }
                    >
                        <Input
                            aria-label='api key'
                            type='password'
                            value={config.apiKey}
                            variant='bordered'
                            onValueChange={(v) => set('apiKey', v)}
                        />
                    </Field>
                    <Field
                        label={t('services.llm.model')}
                        desc={modelHint ?? t('services.llm.model_desc')}
                    >
                        <Input
                            aria-label='model'
                            value={config.model}
                            variant='bordered'
                            onValueChange={(v) => set('model', v)}
                        />
                    </Field>
                    {supportsStream && (
                        <Field
                            label={t('services.llm.stream')}
                            desc={t('services.llm.stream_desc')}
                        >
                            <div className='flex justify-end'>
                                <Switch
                                    aria-label='stream'
                                    isSelected={config.stream}
                                    onValueChange={(v) => set('stream', v)}
                                />
                            </div>
                        </Field>
                    )}
                </Group>

                <Group title={t('services.llm.prompt')}>
                    <div className='py-2'>
                        <Textarea
                            label={t('services.llm.system_prompt')}
                            labelPlacement='outside'
                            variant='bordered'
                            minRows={2}
                            value={config.systemPrompt}
                            onValueChange={(v) => set('systemPrompt', v)}
                        />
                        <Textarea
                            className='mt-2'
                            label={t('services.llm.user_prompt')}
                            labelPlacement='outside'
                            variant='bordered'
                            minRows={2}
                            value={config.userPrompt}
                            onValueChange={(v) => set('userPrompt', v)}
                        />
                        <p className='config-desc'>{t('services.llm.prompt_description')}</p>
                    </div>
                </Group>

                <Button
                    type='submit'
                    isLoading={isLoading}
                    fullWidth
                    color='primary'
                    className='mt-4'
                >
                    {t('common.save')}
                </Button>
            </form>
        )
    );
}
