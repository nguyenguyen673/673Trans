import { Input, Button, Select, SelectItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';

import { INSTANCE_NAME_CONFIG_KEY, getDisplayInstanceName, getServiceName } from '../../../utils/service_instance';
import { LLM_SERVICES } from '../../../utils/translate_mode';
import { useConfig } from '../../../hooks/useConfig';
import { store } from '../../../utils/store';

export function Config(props) {
    const { instanceKey, updateServiceList, onClose } = props;
    const { t } = useTranslation();
    const [config, setConfig] = useConfig(
        instanceKey,
        { [INSTANCE_NAME_CONFIG_KEY]: t('services.dictionary.ai_dict.title'), aiService: 'auto' },
        { sync: false }
    );
    const [options, setOptions] = useState([]);

    useEffect(() => {
        (async () => {
            const list = (await store.get('translate_service_list')) ?? [];
            const out = [];
            for (const k of list) {
                const name = getServiceName(k);
                if (!LLM_SERVICES.includes(name)) continue;
                const cfg = (await store.get(k)) ?? {};
                out.push({
                    key: k,
                    label: getDisplayInstanceName(cfg[INSTANCE_NAME_CONFIG_KEY], () =>
                        t(`services.translate.${name}.title`)
                    ),
                });
            }
            setOptions(out);
        })();
    }, []);

    return (
        config !== null && (
            <>
                <h4 className='config-section-title'>{t('services.llm.general')}</h4>
                <div className='llm-group'>
                    <div className='config-item'>
                        <div className='config-label'>
                            <h3>{t('config.service.service_name')}</h3>
                        </div>
                        <div className='llm-field-control'>
                            <Input
                                aria-label='name'
                                variant='bordered'
                                value={config[INSTANCE_NAME_CONFIG_KEY]}
                                onValueChange={(v) => setConfig({ ...config, [INSTANCE_NAME_CONFIG_KEY]: v })}
                            />
                        </div>
                    </div>
                    <div className='config-item'>
                        <div className='config-label'>
                            <h3>{t('services.dictionary.ai_dict.service')}</h3>
                            <p className='config-desc'>{t('services.dictionary.ai_dict.service_desc')}</p>
                        </div>
                        <div className='llm-field-control'>
                            <Select
                                aria-label='ai service'
                                variant='bordered'
                                selectedKeys={[config.aiService ?? 'auto']}
                                onSelectionChange={(keys) => {
                                    const v = Array.from(keys)[0];
                                    if (v) setConfig({ ...config, aiService: v });
                                }}
                            >
                                {[{ key: 'auto', label: t('services.dictionary.ai_dict.auto') }, ...options].map(
                                    (o) => (
                                        <SelectItem key={o.key}>{o.label}</SelectItem>
                                    )
                                )}
                            </Select>
                        </div>
                    </div>
                </div>
                <Button
                    fullWidth
                    color='primary'
                    className='llm-save mt-4'
                    onPress={() => {
                        setConfig(config, true);
                        updateServiceList(instanceKey);
                        onClose();
                    }}
                >
                    {t('common.save')}
                </Button>
            </>
        )
    );
}
