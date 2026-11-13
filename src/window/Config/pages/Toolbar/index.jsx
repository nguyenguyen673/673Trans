// Settings for the selection toolbar (src/window/SelToolbar + src-tauri/src/sel_toolbar.rs)
import { LuLanguages, LuReplace, LuVolume2, LuCopy, LuClipboardCopy, LuBookOpen } from 'react-icons/lu';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { LuGripVertical } from 'react-icons/lu';
import PreviewBox from '../../PreviewBox';
import { Switch, Input, Slider, Tabs, Tab } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import React from 'react';

import { Section, Row } from '../../components/Setting';
import { useConfig } from '../../../../hooks/useConfig';

// All buttons the bar can show, in the order they appear on the bar
const ACTION_IDS = ['translate', 'replace', 'translate_copy', 'speak', 'dictionary', 'copy'];
const ACTION_ICONS = {
    translate: LuLanguages,
    replace: LuReplace,
    translate_copy: LuClipboardCopy,
    speak: LuVolume2,
    dictionary: LuBookOpen,
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
    const [layout, setLayout] = useConfig('selection_toolbar_layout', 'horizontal');
    const [display, setDisplay] = useConfig('selection_toolbar_display', 'icon');
    const [offsetX, setOffsetX] = useConfig('selection_toolbar_offset_x', 0);
    const [offsetY, setOffsetY] = useConfig('selection_toolbar_offset_y', 12);

    const [savedOrder, setSavedOrder] = useConfig('selection_toolbar_order', ACTION_IDS);
    // every action in the user's order (new actions are appended)
    const order = [
        ...(savedOrder ?? ACTION_IDS).filter((x) => ACTION_IDS.includes(x)),
        ...ACTION_IDS.filter((x) => !(savedOrder ?? []).includes(x)),
    ];

    const toggleAction = (id, on) => {
        const next = order.filter((x) => (x === id ? on : actions.includes(x)));
        // Keep at least one button
        if (next.length > 0) setActions(next);
    };

    const onDragEnd = (result) => {
        if (!result.destination || result.destination.index === result.source.index) return;
        const next = Array.from(order);
        const [moved] = next.splice(result.source.index, 1);
        next.splice(result.destination.index, 0, moved);
        setSavedOrder(next);
        setActions(next.filter((x) => actions.includes(x)));
    };

    return (
        <>
            {actions !== null && (
                <>
                    <PreviewBox title={t('config.toolbar.preview')}>
                        <div className='toolbar-preview'>
                            <div className='toolbar-preview-stage'>
                                <span className='toolbar-preview-text'>Hello 673Trans</span>
                                <div
                                    className={`toolbar-preview-bar bg-content1 border-1 border-default-200 ${
                                        layout === 'vertical' ? 'is-vertical' : ''
                                    }`}
                                    style={{
                                        transform: `translate(${(offsetX ?? 0) - 40}px, ${(offsetY ?? 12) - 12}px)`,
                                    }}
                                >
                                    {actions
                                        .filter((id) => ACTION_IDS.includes(id))
                                        .map((id) => {
                                            const Icon = ACTION_ICONS[id];
                                            return (
                                                <span
                                                    key={id}
                                                    title={t(`config.toolbar.action.${id}`)}
                                                >
                                                    {display !== 'text' && <Icon />}
                                                    {display !== 'icon' && <em>{t(`config.toolbar.short.${id}`)}</em>}
                                                </span>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </PreviewBox>
                </>
            )}

            <Section title={t('config.toolbar.position')}>
                <Row label={t('config.toolbar.layout')}>
                    {layout !== null && (
                        <Tabs
                            aria-label='layout'
                            size='sm'
                            selectedKey={layout}
                            onSelectionChange={(k) => setLayout(k)}
                        >
                            <Tab
                                key='horizontal'
                                title={t('config.toolbar.layout_horizontal')}
                            />
                            <Tab
                                key='vertical'
                                title={t('config.toolbar.layout_vertical')}
                            />
                        </Tabs>
                    )}
                </Row>
                <Row label={t('config.toolbar.display')}>
                    {display !== null && (
                        <Tabs
                            aria-label='display'
                            size='sm'
                            selectedKey={display}
                            onSelectionChange={(k) => setDisplay(k)}
                        >
                            <Tab
                                key='icon'
                                title={t('config.toolbar.display_icon')}
                            />
                            <Tab
                                key='text'
                                title={t('config.toolbar.display_text')}
                            />
                            <Tab
                                key='both'
                                title={t('config.toolbar.display_both')}
                            />
                        </Tabs>
                    )}
                </Row>
                <Row
                    label={t('config.toolbar.offset_x')}
                    desc={t('config.toolbar.offset_x_desc')}
                >
                    {offsetX !== null && (
                        <div className='toolbar-slider'>
                            <Slider
                                aria-label='offset x'
                                size='sm'
                                minValue={-100}
                                maxValue={100}
                                step={1}
                                value={offsetX}
                                onChange={(v) => setOffsetX(Array.isArray(v) ? v[0] : v)}
                            />
                            <span>{offsetX} px</span>
                        </div>
                    )}
                </Row>
                <Row
                    label={t('config.toolbar.offset_y')}
                    desc={t('config.toolbar.offset_y_desc')}
                >
                    {offsetY !== null && (
                        <div className='toolbar-slider'>
                            <Slider
                                aria-label='offset y'
                                size='sm'
                                minValue={-100}
                                maxValue={100}
                                step={1}
                                value={offsetY}
                                onChange={(v) => setOffsetY(Array.isArray(v) ? v[0] : v)}
                            />
                            <span>{offsetY} px</span>
                        </div>
                    )}
                </Row>
            </Section>

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
                {actions !== null && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId='toolbar-actions'>
                            {(dropProvided) => (
                                <div
                                    ref={dropProvided.innerRef}
                                    {...dropProvided.droppableProps}
                                >
                                    {order.map((id, index) => {
                                        const Icon = ACTION_ICONS[id];
                                        return (
                                            <Draggable
                                                key={id}
                                                draggableId={id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={snapshot.isDragging ? 'toolbar-row-dragging' : ''}
                                                    >
                                                        <Row
                                                            label={
                                                                <span className='flex items-center gap-[10px]'>
                                                                    <span
                                                                        {...provided.dragHandleProps}
                                                                        className='toolbar-grip'
                                                                        title={t('config.toolbar.drag')}
                                                                    >
                                                                        <LuGripVertical />
                                                                    </span>
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
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {dropProvided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
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
