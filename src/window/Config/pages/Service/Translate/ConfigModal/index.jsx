// Add / edit dialog for one translation service.
// When adding, the provider is picked from the dropdown at the top; the form
// below it belongs to the provider (src/services/translate/<name>/Config.jsx).
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { LuChevronDown } from 'react-icons/lu';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as builtinServices from '../../../../../../services/translate';
import { PluginConfig } from '../../PluginConfig';
import { getServiceName, whetherPluginService } from '../../../../../../utils/service_instance';

// AI providers first, then international engines, Chinese platforms last
const FIRST = ['deepseek', 'openai', 'claude', 'geminipro', 'openai_compatible', 'ollama'];
const LAST = ['chatglm', 'baidu', 'baidu_field', 'tencent', 'alibaba', 'volcengine', 'niutrans', 'youdao', 'caiyun', 'transmart'];
const serviceOrder = [
    ...FIRST,
    ...Object.keys(builtinServices).filter((x) => !FIRST.includes(x) && !LAST.includes(x)),
    ...LAST.filter((x) => x in builtinServices),
];

function ServiceIcon({ src }) {
    return (
        <img
            src={src}
            className='service-icon'
            draggable={false}
        />
    );
}

// Every provider form brings its own Save button somewhere at the end of the form.
// The dialog hides that one and shows Cancel / Save in a footer that never scrolls
// away; the footer's Save just presses the hidden button.
function useFormSaveButton() {
    const buttonRef = useRef(null);
    const observerRef = useRef(null);
    const [state, setState] = useState({ found: false, loading: false });

    const containerRef = useCallback((node) => {
        observerRef.current?.disconnect();
        buttonRef.current = null;
        if (!node) return;
        const scan = () => {
            const buttons = node.querySelectorAll('button.bg-primary');
            const button = buttons.length > 0 ? buttons[buttons.length - 1] : null;
            if (button) button.classList.add('service-dialog-hidden-save');
            buttonRef.current = button;
            const next = { found: button !== null, loading: button?.getAttribute('data-loading') === 'true' };
            setState((prev) => (prev.found === next.found && prev.loading === next.loading ? prev : next));
        };
        scan();
        observerRef.current = new MutationObserver(scan);
        observerRef.current.observe(node, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-loading'],
        });
    }, []);

    useEffect(() => () => observerRef.current?.disconnect(), []);

    return { containerRef, ...state, save: () => buttonRef.current?.click() };
}

export default function ConfigModal(props) {
    const {
        serviceInstanceKey,
        pluginList,
        isOpen,
        onOpenChange,
        updateServiceInstanceList,
        isAdding,
        onSwitchService,
    } = props;

    const pluginServiceFlag = whetherPluginService(serviceInstanceKey);
    const serviceName = getServiceName(serviceInstanceKey);

    const { t } = useTranslation();
    const saveButton = useFormSaveButton();
    const ConfigComponent = pluginServiceFlag ? PluginConfig : builtinServices[serviceName].Config;
    const icon = pluginServiceFlag ? pluginList[serviceName]?.icon : builtinServices[serviceName].info.icon;
    const title = pluginServiceFlag
        ? `${pluginList[serviceName]?.display} [${t('common.plugin')}]`
        : t(`services.translate.${serviceName}.title`);

    return pluginServiceFlag && !(serviceName in pluginList) ? (
        <></>
    ) : (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            scrollBehavior='inside'
            size='2xl'
        >
            <ModalContent className='h-[88vh] max-h-[88vh]'>
                {(onClose) => (
                    <>
                        <ModalHeader className='service-dialog-title'>
                            {isAdding && !pluginServiceFlag
                                ? t('config.service.add_translate_service')
                                : t('config.service.edit_translate_service')}
                        </ModalHeader>
                        <ModalBody className='service-dialog'>
                            <div className='service-dialog-provider'>
                                <span>{t('config.service.builtin_service')}</span>
                                {isAdding && !pluginServiceFlag ? (
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <Button
                                                variant='bordered'
                                                className='service-dialog-select'
                                                startContent={<ServiceIcon src={icon} />}
                                                endContent={<LuChevronDown className='text-default-500' />}
                                            >
                                                <span className='flex-1 text-left'>{title}</span>
                                            </Button>
                                        </DropdownTrigger>
                                        <DropdownMenu
                                            aria-label='service'
                                            className='max-h-[45vh] overflow-y-auto'
                                            selectionMode='single'
                                            selectedKeys={[serviceName]}
                                            onAction={(key) => {
                                                if (key !== serviceName) onSwitchService(key);
                                            }}
                                        >
                                            {serviceOrder.map((x) => (
                                                <DropdownItem
                                                    key={x}
                                                    startContent={<ServiceIcon src={builtinServices[x].info.icon} />}
                                                >
                                                    {t(`services.translate.${builtinServices[x].info.name}.title`)}
                                                </DropdownItem>
                                            ))}
                                        </DropdownMenu>
                                    </Dropdown>
                                ) : (
                                    <div className='service-dialog-fixed'>
                                        <ServiceIcon src={icon} />
                                        {title}
                                    </div>
                                )}
                            </div>
                            {/* key: a fresh form (and a fresh draft) for every provider */}
                            <div
                                key={serviceInstanceKey}
                                ref={saveButton.containerRef}
                            >
                                <ConfigComponent
                                    name={serviceName}
                                    instanceKey={serviceInstanceKey}
                                    pluginType='translate'
                                    pluginList={pluginList}
                                    updateServiceList={updateServiceInstanceList}
                                    onClose={onClose}
                                />
                            </div>
                        </ModalBody>
                        <ModalFooter className='service-dialog-footer'>
                            <Button
                                variant='flat'
                                onPress={onClose}
                            >
                                {t('common.cancel')}
                            </Button>
                            {saveButton.found && (
                                <Button
                                    color='primary'
                                    isLoading={saveButton.loading}
                                    onPress={saveButton.save}
                                >
                                    {t('common.save')}
                                </Button>
                            )}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
