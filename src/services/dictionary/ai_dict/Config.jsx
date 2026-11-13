import { Input, Button, Select, SelectItem } from '@nextui-org/react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/api/shell';
import React, { useState } from 'react';

import { INSTANCE_NAME_CONFIG_KEY } from '../../../utils/service_instance';
import { PROVIDERS, defaultConfig, getProvider, runAi } from './provider';
import { useConfig } from '../../../hooks/useConfig';
import { useToastStyle } from '../../../hooks';

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

export function Config(props) {
    const { instanceKey, updateServiceList, onClose } = props;
    const { t } = useTranslation();
    const [config, setConfig] = useConfig(
        instanceKey,
        { [INSTANCE_NAME_CONFIG_KEY]: t('services.dictionary.ai_dict.title'), ...defaultConfig() },
        { sync: false }
    );
    const [isLoading, setIsLoading] = useState(false);
    const toastStyle = useToastStyle();
    const set = (key, value) => setConfig({ ...config, [key]: value });
    const provider = config ? getProvider(config.provider) : null;

    return (
        config !== null && (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setIsLoading(true);
                    // One real request with these settings before saving
                    runAi(config, 'hello', 'dict').then(
                        () => {
                            setIsLoading(false);
                            setConfig(config, true);
                            updateServiceList(instanceKey);
                            onClose();
                        },
                        (err) => {
                            setIsLoading(false);
                            const msg = err?.message === 'NO_AI' ? t('services.llm.api_key') : String(err?.message ?? err);
                            toast.error(t('config.service.test_failed') + ': ' + msg, { style: toastStyle });
                        }
                    );
                }}
            >
                <Toaster />
                <h4 className='config-section-title'>{t('services.llm.general')}</h4>
                <div className='llm-group'>
                    <Field label={t('config.service.service_name')}>
                        <Input
                            aria-label='name'
                            variant='bordered'
                            value={config[INSTANCE_NAME_CONFIG_KEY]}
                            onValueChange={(v) => set(INSTANCE_NAME_CONFIG_KEY, v)}
                        />
                    </Field>
                    <Field
                        label={t('services.dictionary.ai_dict.provider')}
                        desc={t('services.dictionary.ai_dict.provider_desc')}
                    >
                        <Select
                            aria-label='provider'
                            variant='bordered'
                            disallowEmptySelection
                            selectedKeys={[provider.id]}
                            onSelectionChange={(keys) => {
                                const id = Array.from(keys)[0];
                                if (!id || id === provider.id) return;
                                // new provider: its own URL and model, keep name, key and timeout
                                const d = defaultConfig(id);
                                setConfig({ ...config, provider: id, requestPath: d.requestPath, model: d.model });
                            }}
                        >
                            {PROVIDERS.map((p) => (
                                <SelectItem key={p.id}>{t(`services.dictionary.ai_dict.providers.${p.id}`)}</SelectItem>
                            ))}
                        </Select>
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
                            variant='bordered'
                            value={String(config.timeout ?? 30000)}
                            endContent={<span className='text-default-500 text-[12px]'>ms</span>}
                            onValueChange={(v) => set('timeout', parseInt(v) || 30000)}
                        />
                    </Field>
                </div>

                <h4 className='config-section-title'>{t(`services.dictionary.ai_dict.providers.${provider.id}`)}</h4>
                <div className='llm-group'>
                    <Field
                        label={t('services.llm.api_key')}
                        desc={
                            <>
                                {t('services.llm.api_key_desc')}{' '}
                                {provider.keyUrl && (
                                    <a
                                        className='text-primary cursor-pointer underline'
                                        onClick={() => open(provider.keyUrl)}
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
                            variant='bordered'
                            value={config.apiKey ?? ''}
                            onValueChange={(v) => set('apiKey', v)}
                        />
                    </Field>
                    <Field
                        label={t('services.llm.request_path')}
                        desc={t('services.llm.request_path_desc')}
                    >
                        <Input
                            aria-label='url'
                            variant='bordered'
                            value={config.requestPath ?? ''}
                            onValueChange={(v) => set('requestPath', v)}
                        />
                    </Field>
                    {!provider.noModel && (
                        <Field
                            label={t('services.llm.model')}
                            desc={t('services.llm.model_desc')}
                        >
                            <Input
                                aria-label='model'
                                variant='bordered'
                                value={config.model ?? ''}
                                onValueChange={(v) => set('model', v)}
                            />
                        </Field>
                    )}
                </div>

                <Button
                    type='submit'
                    isLoading={isLoading}
                    fullWidth
                    color='primary'
                    className='llm-save mt-4'
                >
                    {t('common.save')}
                </Button>
            </form>
        )
    );
}
