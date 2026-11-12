// Shared settings form for LLM based translators (DeepSeek, Claude, ...).
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

const inputClassNames = {
    base: 'justify-between',
    label: 'text-[length:--nextui-font-size-medium]',
    mainWrapper: 'max-w-[55%]',
};

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
        supportsStream = true,
    } = props;
    const { t } = useTranslation();
    const [config, setConfig] = useConfig(
        instanceKey,
        {
            [INSTANCE_NAME_CONFIG_KEY]: title,
            apiKey: '',
            stream: supportsStream,
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
                <div className='config-item'>
                    <Input
                        label={t('services.instance_name')}
                        labelPlacement='outside-left'
                        value={config[INSTANCE_NAME_CONFIG_KEY]}
                        variant='bordered'
                        classNames={inputClassNames}
                        onValueChange={(v) => set(INSTANCE_NAME_CONFIG_KEY, v)}
                    />
                </div>
                <div className='config-item'>
                    <Input
                        label={t('services.llm.api_key')}
                        labelPlacement='outside-left'
                        type='password'
                        value={config.apiKey}
                        variant='bordered'
                        classNames={inputClassNames}
                        onValueChange={(v) => set('apiKey', v)}
                    />
                </div>
                {keyUrl && (
                    <p className='config-desc text-right'>
                        <a
                            className='text-primary cursor-pointer'
                            onClick={() => open(keyUrl)}
                        >
                            {t('services.llm.get_key')}
                        </a>
                    </p>
                )}
                <div className='config-item'>
                    <Input
                        label={t('services.llm.model')}
                        labelPlacement='outside-left'
                        value={config.model}
                        variant='bordered'
                        classNames={inputClassNames}
                        onValueChange={(v) => set('model', v)}
                    />
                </div>
                {modelHint && <p className='config-desc text-right'>{modelHint}</p>}
                <div className='config-item'>
                    <Input
                        label={t('services.llm.request_path')}
                        labelPlacement='outside-left'
                        value={config.requestPath}
                        variant='bordered'
                        classNames={inputClassNames}
                        onValueChange={(v) => set('requestPath', v)}
                    />
                </div>
                {supportsStream && (
                    <div className='config-item'>
                        <Switch
                            isSelected={config.stream}
                            onValueChange={(v) => set('stream', v)}
                            classNames={{ base: 'flex flex-row-reverse justify-between w-full max-w-full' }}
                        >
                            {t('services.llm.stream')}
                        </Switch>
                    </div>
                )}
                <div className='mt-2'>
                    <Textarea
                        label={t('services.llm.system_prompt')}
                        labelPlacement='outside'
                        variant='bordered'
                        minRows={2}
                        value={config.systemPrompt}
                        onValueChange={(v) => set('systemPrompt', v)}
                    />
                </div>
                <div className='mt-2'>
                    <Textarea
                        label={t('services.llm.user_prompt')}
                        labelPlacement='outside'
                        variant='bordered'
                        minRows={2}
                        value={config.userPrompt}
                        onValueChange={(v) => set('userPrompt', v)}
                    />
                </div>
                <p className='config-desc mb-3'>{t('services.llm.prompt_description')}</p>
                <Button
                    type='submit'
                    isLoading={isLoading}
                    fullWidth
                    color='primary'
                >
                    {t('common.save')}
                </Button>
            </form>
        )
    );
}
