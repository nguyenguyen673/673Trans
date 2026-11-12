import { useLocation, useRoutes } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';

import WindowControl from '../../components/WindowControl';
import SideBar from './components/SideBar';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import routes from './routes';
import './style.css';

export default function Config() {
    const [transparent] = useConfig('transparent', true);
    const { t } = useTranslation();
    const location = useLocation();
    const page = useRoutes(routes);

    useEffect(() => {
        if (appWindow.label === 'config') {
            appWindow.show();
        }
    }, []);

    return (
        <>
            <aside
                className={`config-sidebar ${transparent ? 'bg-background/90' : 'bg-background'} ${
                    osType === 'Linux' && 'rounded-l-[10px] border-1'
                } border-r-1 border-default-100 select-none cursor-default`}
            >
                <div
                    className='config-brand'
                    data-tauri-drag-region='true'
                >
                    <span
                        className='config-brand-mark'
                        data-tauri-drag-region='true'
                    >
                        673
                    </span>
                    <span
                        className='config-brand-name'
                        data-tauri-drag-region='true'
                    >
                        Trans
                    </span>
                </div>
                <SideBar />
            </aside>
            <div
                className={`config-main bg-background select-none cursor-default ${
                    osType === 'Linux' && 'rounded-r-[10px] border-1 border-l-0 border-default-100'
                }`}
            >
                <div
                    data-tauri-drag-region='true'
                    className='top-[5px] left-[225px] right-[110px] h-[40px] fixed'
                />
                <div className='config-header'>
                    <h2 className='config-title'>{t(`config.${location.pathname.slice(1)}.title`)}</h2>
                    <div className='flex'>{osType !== 'Darwin' && <WindowControl />}</div>
                </div>
                <div className='config-page'>{page}</div>
            </div>
        </>
    );
}
