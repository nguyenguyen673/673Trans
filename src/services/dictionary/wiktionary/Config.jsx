import { Input, Button } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import React from 'react';

import { INSTANCE_NAME_CONFIG_KEY } from '../../../utils/service_instance';
import { useConfig } from '../../../hooks/useConfig';

export function Config(props) {
    const { instanceKey, updateServiceList, onClose } = props;
    const { t } = useTranslation();
    const [config, setConfig] = useConfig(
        instanceKey,
        { [INSTANCE_NAME_CONFIG_KEY]: t('services.dictionary.wiktionary.title') },
        { sync: false }
    );

    return (
        config !== null && (
            <>
                <h4 className='config-section-title'>{t('services.llm.general')}</h4>
                <div className='llm-group'>
                    <div className='config-item'>
                        <div className='config-label'>
                            <h3>{t('config.service.service_name')}</h3>
                            <p className='config-desc'>{t('services.dictionary.wiktionary.desc')}</p>
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
