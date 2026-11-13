import { Input, Button } from '@nextui-org/react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/api/dialog';
import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';

import { INSTANCE_NAME_CONFIG_KEY } from '../../../utils/service_instance';
import { useConfig } from '../../../hooks/useConfig';
import { useToastStyle } from '../../../hooks';
import { dataFileExists, lookup, resetCache } from './index';

export function Config(props) {
    const { instanceKey, updateServiceList, onClose } = props;
    const { t } = useTranslation();
    const toastStyle = useToastStyle();
    const [hasData, setHasData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [config, setConfig] = useConfig(
        instanceKey,
        { [INSTANCE_NAME_CONFIG_KEY]: t('services.dictionary.ev_offline.title') },
        { sync: false }
    );

    useEffect(() => {
        dataFileExists().then(setHasData);
    }, []);

    const pickFile = async () => {
        const file = await open({
            multiple: false,
            filters: [{ name: 'dict-data.json / .mplugin', extensions: ['json', 'mplugin', 'zip'] }],
        });
        if (!file) return;
        try {
            await invoke('dict_import', { src: file });
            resetCache();
            setHasData(true);
            toast.success(t('services.dictionary.ev_offline.imported'), { style: toastStyle });
        } catch (e) {
            toast.error(String(e), { style: toastStyle });
        }
    };

    const save = async () => {
        setBusy(true);
        try {
            await lookup('hello');
            setConfig(config, true);
            updateServiceList(instanceKey);
            onClose();
        } catch (e) {
            toast.error(e?.message === 'NO_DATA' ? t('services.dictionary.ev_offline.no_data') : String(e), {
                style: toastStyle,
            });
        }
        setBusy(false);
    };

    return (
        config !== null && (
            <>
                <Toaster />
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
                            <h3>{t('services.dictionary.ev_offline.data')}</h3>
                            <p className='config-desc'>
                                {hasData
                                    ? t('services.dictionary.ev_offline.data_ok')
                                    : t('services.dictionary.ev_offline.data_desc')}
                            </p>
                        </div>
                        <Button
                            variant='flat'
                            color={hasData ? 'default' : 'primary'}
                            onPress={pickFile}
                        >
                            {t('services.dictionary.ev_offline.pick')}
                        </Button>
                    </div>
                </div>
                <Button
                    fullWidth
                    color='primary'
                    isLoading={busy}
                    className='llm-save mt-4'
                    onPress={save}
                >
                    {t('common.save')}
                </Button>
            </>
        )
    );
}
