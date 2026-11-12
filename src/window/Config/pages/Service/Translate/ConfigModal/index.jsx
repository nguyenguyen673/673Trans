// Add / edit dialog for one translation service.
// When adding, the provider is picked from the dropdown at the top; the form
// below it belongs to the provider (src/services/translate/<name>/Config.jsx).
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    Button,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { LuChevronDown } from 'react-icons/lu';
import React from 'react';

import * as builtinServices from '../../../../../../services/translate';
import { PluginConfig } from '../../PluginConfig';
import { getServiceName, whetherPluginService } from '../../../../../../utils/service_instance';

// AI providers first, then the classic engines
const FIRST = ['deepseek', 'openai', 'claude', 'geminipro', 'openai_compatible', 'ollama', 'chatglm'];
const serviceOrder = [...FIRST, ...Object.keys(builtinServices).filter((x) => !FIRST.includes(x))];

function ServiceIcon({ src }) {
    return (
        <img
            src={src}
            className='service-icon'
            draggable={false}
        />
    );
}

export default function ConfigModal(props) {
    const { serviceInstanceKey, pluginList, isOpen, onOpenChange, updateServiceInstanceList, isAdding, onSwitchService } =
        props;

    const pluginServiceFlag = whetherPluginService(serviceInstanceKey);
    const serviceName = getServiceName(serviceInstanceKey);

    const { t } = useTranslation();
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
            size='lg'
        >
            <ModalContent className='max-h-[82vh]'>
                {(onClose) => (
                    <>
                        <ModalHeader className='service-dialog-title'>
                            {isAdding && !pluginServiceFlag
                                ? t('config.service.add_translate_service')
                                : t('config.service.edit_translate_service')}
                        </ModalHeader>
                        <ModalBody className='service-dialog pb-5'>
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
                            <ConfigComponent
                                key={serviceInstanceKey}
                                name={serviceName}
                                instanceKey={serviceInstanceKey}
                                pluginType='translate'
                                pluginList={pluginList}
                                updateServiceList={updateServiceInstanceList}
                                onClose={onClose}
                            />
                            <Button
                                variant='light'
                                size='sm'
                                className='service-dialog-cancel'
                                onPress={onClose}
                            >
                                {t('common.cancel')}
                            </Button>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
