// Static preview of the translate popup, following the options of this page
import { useTranslation } from 'react-i18next';
import { BiTransferAlt } from 'react-icons/bi';
import { BsPinFill } from 'react-icons/bs';
import { AiFillCloseCircle } from 'react-icons/ai';
import React from 'react';

import { useConfig } from '../../../../hooks/useConfig';

export default function PopupPreview() {
    const { t } = useTranslation();
    const [hideSource] = useConfig('translate_hide_source', false);
    const [hideLanguage] = useConfig('translate_hide_language', false);
    const [pin] = useConfig('translate_always_on_top', false);

    return (
        <div className='popup-preview'>
            <h4 className='config-section-title'>{t('config.preview')}</h4>
            <div className='popup-preview-window bg-background border-1 border-default-200'>
                <div className='popup-preview-bar'>
                    <BsPinFill className={pin ? 'text-primary' : 'text-default-400'} />
                    <AiFillCloseCircle className='text-default-400' />
                </div>
                {!hideSource && (
                    <div className='popup-preview-card bg-content2'>
                        <div>The company offers three plans.</div>
                    </div>
                )}
                {!hideLanguage && (
                    <div className='popup-preview-card popup-preview-lang bg-content2'>
                        <span>{t('languages.en')}</span>
                        <BiTransferAlt />
                        <span>{t('languages.vi')}</span>
                    </div>
                )}
                <div className='popup-preview-card bg-content2'>
                    <b>Google</b>
                    <div>Công ty cung cấp ba gói.</div>
                </div>
                <div className='popup-preview-card bg-content2'>
                    <b>DeepL</b>
                    <div>Công ty đưa ra ba gói dịch vụ.</div>
                </div>
            </div>
        </div>
    );
}
