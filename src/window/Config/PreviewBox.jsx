import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';

// "Preview" section that stays folded until you open it
export default function PreviewBox({ title, children }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <div className='preview-box'>
            <button
                className='preview-toggle'
                onClick={() => setOpen(!open)}
            >
                {open ? <LuChevronDown /> : <LuChevronRight />}
                <span>{title ?? t('config.preview')}</span>
                <span className='preview-toggle-hint'>{open ? t('config.preview_hide') : t('config.preview_show')}</span>
            </button>
            {open && <div className='preview-body'>{children}</div>}
        </div>
    );
}
