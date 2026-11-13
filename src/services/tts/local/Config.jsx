import { Input, Button, Switch, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';

import { INSTANCE_NAME_CONFIG_KEY } from '../../../utils/service_instance';
import { useConfig } from '../../../hooks/useConfig';
import { useToastStyle } from '../../../hooks';
import { DEFAULTS, tts } from './index';

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

const ENGINES = { edge: 'Edge (có sẵn trong app, cần mạng)', piper: 'Piper offline (cần server riêng)' };
const YESNO = { yes: 'Có', no: 'Không' };

export function Config(props) {
    const { instanceKey, updateServiceList, onClose } = props;
    const { t } = useTranslation();
    const toastStyle = useToastStyle();
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useConfig(
        instanceKey,
        { [INSTANCE_NAME_CONFIG_KEY]: 'Local TTS', timeout: 60000, ...DEFAULTS },
        { sync: false }
    );
    const set = (k, v) => setConfig({ ...config, [k]: v });
    const text = (key, label, desc) => (
        <Field
            label={label}
            desc={desc}
        >
            <Input
                aria-label={key}
                variant='bordered'
                value={config[key] ?? ''}
                onValueChange={(v) => set(key, v)}
            />
        </Field>
    );
    const pick = (key, label, options, desc) => (
        <Field
            label={label}
            desc={desc}
        >
            <Dropdown>
                <DropdownTrigger>
                    <Button
                        variant='bordered'
                        className='w-full justify-between'
                    >
                        {options[config[key]] ?? config[key]}
                    </Button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label={key}
                    onAction={(k) => set(key, k)}
                >
                    {Object.entries(options).map(([value, name]) => (
                        <DropdownItem key={value}>{name}</DropdownItem>
                    ))}
                </DropdownMenu>
            </Dropdown>
        </Field>
    );

    return (
        config !== null && (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setIsLoading(true);
                    tts('hello', 'en', { config }).then(
                        () => {
                            setIsLoading(false);
                            setConfig(config, true);
                            updateServiceList(instanceKey);
                            onClose();
                        },
                        (err) => {
                            setIsLoading(false);
                            toast.error(t('config.service.test_failed') + ': ' + err.toString(), { style: toastStyle });
                        }
                    );
                }}
            >
                <Toaster />
                <h4 className='config-section-title'>{t('services.llm.general')}</h4>
                <div className='llm-group'>
                    {text(INSTANCE_NAME_CONFIG_KEY, t('config.service.service_name'))}
                </div>
                <h4 className='config-section-title'>Local TTS server</h4>
                <div className='llm-group'>
                    {text('serverUrl', 'Server URL', 'Địa chỉ tts_server.py (mặc định cổng 5052).')}
                    {text('serverDir', 'Thư mục server', 'Tuỳ chọn. Chỉ cần nếu bạn dùng Piper offline hoặc kho audio người thật (thư mục chứa tts_server.py). Giọng Edge đã có sẵn, không cần.')}
                    <Field
                        label='Tự bật server'
                        desc='Nếu server chưa chạy khi đọc, 673Trans sẽ bật nó (ẩn, không hiện cửa sổ).'
                    >
                        <div className='flex justify-end'>
                            <Switch
                                aria-label='autoStart'
                                isSelected={config.autoStart !== false}
                                onValueChange={(v) => set('autoStart', v)}
                            />
                        </div>
                    </Field>
                    {pick('engine', 'Engine đọc câu dài', ENGINES, 'Edge đã tích hợp sẵn trong app (cần mạng). Nếu server riêng của bạn đang chạy thì app dùng server đó trước.')}
                    {text('edgeEnVoice', 'Giọng tiếng Anh (Edge)', 'vd: en-US-AndrewNeural, en-US-AriaNeural')}
                    {text('edgeViVoice', 'Giọng tiếng Việt (Edge)', 'vd: vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural')}
                    {text('enVoice', 'Giọng tiếng Anh (Piper, offline)', 'Phải có trong thư mục voices/.')}
                    {text('viVoice', 'Giọng tiếng Việt (Piper, offline)', 'Phải có trong thư mục voices/.')}
                    {text('speed', 'Tốc độ đọc', '0.5 – 2.0, vd 1.0 hoặc 1.2')}
                    {pick('useWordPack', 'Ưu tiên kho audio người thật', YESNO, 'Từ đơn tiếng Anh đọc bằng giọng người thật (thư mục word_audio/).')}
                    {text('maxWords', 'Số từ tối đa để tra kho audio', 'Cụm dài hơn sẽ đọc bằng Edge/Piper.')}
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
