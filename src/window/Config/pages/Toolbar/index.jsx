// Settings for the selection toolbar (src/window/SelToolbar + src-tauri/src/sel_toolbar.rs)
import { LuLanguages, LuReplace, LuVolume2, LuCopy, LuClipboardCopy } from 'react-icons/lu';
import { Switch, Input } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import React from 'react';

import { Section, Row } from '../../components/Setting';
import { useConfig } from '../../../../hooks/useConfig';

// All buttons the bar can show, in the order they appear on the bar
const ACTION_IDS = ['translate', 'replace', 'translate_copy', 'speak', 'copy'];
const ACTION_ICONS = {
    translate: LuLanguages,
    replace: LuReplace,
    translate_copy: LuClipboardCopy,
    speak: LuVolume2,
    copy: LuCopy,
};
const DEFAULT_ACTIONS = ['translate', 'replace', 'speak'];

export default function Toolbar() {
    const { t } = useTranslation();
    const [enable, setEnable] = useConfig('selection_toolbar_enable', true);
    const [doubleClick, setDoubleClick] = useConfig('selection_toolbar_double_click', true);
    const [ctrlA, setCtrlA] = useConfig('selection_toolbar_ctrl_a', true);
    const [ibeamOnly, setIbeamOnly] = useConfig('selection_toolbar_ibeam_only', true);
    const [blacklist, setBlacklist] = useConfig('selection_toolbar_blacklist', '');
    const [actions, setActions] = useConfig('selection_toolbar_actions', DEFAULT_ACTIONS);

    const toggleAction = (id, on) => {
        const next = ACTION_IDS.filter((x) => (x === id ? on : actions.includes(x)));
        // Keep at least one button
        if (next.length > 0) setActions(next);
    };

    return (
        <>
            {actions !== null && (
                <>
                    <h4 className='config-section-title'>{t('config.toolbar.preview')}</h4>
                    <div className='toolbar-preview'>
                        <span className='toolbar-preview-text'>Hello 673Trans</span>
                        <div className='toolbar-preview-bar bg-content1 border-1 border-default-200'>
                            {ACTION_IDS.filter((id) => actions.includes(id)).map((id) => {
                                const Icon = ACTION_ICONS[id];
                                return (
                                    <span
                                        key={id}
                                        title={t(`config.toolbar.action.${id}`)}
                                    >
                                        <Icon />
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <Section title={t('config.toolbar.general')}>
                <Row label={t('config.toolbar.enable')}>
                    {enable !== null && (
                        <Switch
                            isSelected={enable}
                            onValueChange={setEnable}
                        />
                    )}
                </Row>
                <Row
                    label={t('config.toolbar.double_click')}
                    desc={t('config.toolbar.double_click_desc')}
                >
                    {doubleClick !== null && (
                        <Switch
                            isSelected={doubleClick}
                            onValueChange={setDoubleClick}
                        />
                    )}
                </Row>
                <Row
                    label={t('config.toolbar.ctrl_a')}
                    desc={t('config.toolbar.ctrl_a_desc')}
                >
                    {ctrlA !== null && (
                        <Switch
                            isSelected={ctrlA}
                            onValueChange={setCtrlA}
                        />
                    )}
                </Row>
                <Row
                    label={t('config.toolbar.ibeam_only')}
                    desc={t('config.toolbar.ibeam_only_desc')}
                >
                    {ibeamOnly !== null && (
                        <Switch
                            isSelected={ibeamOnly}
                            onValueChange={setIbeamOnly}
                        />
                    )}
                </Row>
            </Section>

            <Section title={t('config.toolbar.actions')}>
                {actions !== null &&
                    ACTION_IDS.map((id) => {
                        const Icon = ACTION_ICONS[id];
                        return (
                            <Row
                                key={id}
                                label={
                                    <span className='flex items-center gap-[10px]'>
                                        <Icon className='text-[16px] text-default-500' />
                                        {t(`config.toolbar.action.${id}`)}
                                    </span>
                                }
                                desc={t(`config.toolbar.action.${id}_desc`)}
                            >
                                <Switch
                                    isSelected={actions.includes(id)}
                                    onValueChange={(v) => toggleAction(id, v)}
                                />
                            </Row>
                        );
                    })}
            </Section>

            <Section title={t('config.toolbar.apps')}>
                <Row
                    label={t('config.toolbar.blacklist')}
                    desc={t('config.toolbar.blacklist_desc')}
                >
                    {blacklist !== null && (
                        <Input
                            variant='bordered'
                            className='max-w-[45%]'
                            placeholder='AfterFX.exe, Photoshop.exe'
                            value={blacklist}
                            onValueChange={setBlacklist}
                        />
                    )}
                </Row>
            </Section>
        </>
    );
}
