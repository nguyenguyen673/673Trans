import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LuSettings2,
    LuLanguages,
    LuScanLine,
    LuKeyboard,
    LuPuzzle,
    LuHistory,
    LuCloud,
    LuInfo,
} from 'react-icons/lu';
import React from 'react';

// Order of the pages in the sidebar. `path` must match a route in ../../routes
const items = [
    { path: '/general', icon: LuSettings2 },
    { path: '/translate', icon: LuLanguages },
    { path: '/recognize', icon: LuScanLine },
    { path: '/hotkey', icon: LuKeyboard },
    { path: '/service', icon: LuPuzzle },
    { path: '/history', icon: LuHistory },
    { path: '/backup', icon: LuCloud },
    { path: '/about', icon: LuInfo },
];

export default function SideBar() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className='config-nav'>
            {items.map(({ path, icon: Icon }) => {
                const active = location.pathname.includes(path);
                return (
                    <button
                        key={path}
                        type='button'
                        className={`config-nav-item ${active ? 'is-active' : ''}`}
                        onClick={() => navigate(path)}
                    >
                        <Icon className='config-nav-icon' />
                        <span>{t(`config.${path.slice(1)}.label`)}</span>
                    </button>
                );
            })}
        </nav>
    );
}
