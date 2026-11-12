import { RxDragHandleHorizontal } from 'react-icons/rx';
import { Spacer, Button, Switch, Tooltip } from '@nextui-org/react';
import { MdDeleteOutline } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { BiSolidEdit } from 'react-icons/bi';
import { LuPower } from 'react-icons/lu';
import React from 'react';

import * as builtinServices from '../../../../../../services/translate';
import { useConfig } from '../../../../../../hooks';
import { INSTANCE_NAME_CONFIG_KEY, ServiceSourceType, getDisplayInstanceName, getServiceName, getServiceSouceType } from '../../../../../../utils/service_instance';

export default function ServiceItem(props) {
    const { serviceInstanceKey, pluginList, deleteServiceInstance, setCurrentConfigKey, onConfigOpen, ...drag } = props;
    const { t } = useTranslation();
    const [serviceInstanceConfig, setServiceInstanceConfig] = useConfig(serviceInstanceKey, {});

    const serviceSourceType = getServiceSouceType(serviceInstanceKey)
    const serviceName = getServiceName(serviceInstanceKey)

    return serviceSourceType === ServiceSourceType.PLUGIN && !(serviceName in pluginList) ? (
        <></>
    ) : (
        serviceInstanceConfig !== null && (
            <div className='bg-content2 rounded-md px-[10px] py-[20px] flex justify-between'>
                <div className='flex'>
                    <div
                        {...drag}
                        className='text-2xl my-auto'
                    >
                        <RxDragHandleHorizontal />
                    </div>

                    <Spacer x={2} />
                    {serviceSourceType === ServiceSourceType.BUILDIN && (
                        <>
                            <img
                                src={`${builtinServices[serviceName].info.icon}`}
                                className='h-[24px] w-[24px] my-auto'
                                draggable={false}
                            />
                            <Spacer x={2} />
                            <h2 className='my-auto'>{getDisplayInstanceName(serviceInstanceConfig[INSTANCE_NAME_CONFIG_KEY], () => t(`services.translate.${serviceName}.title`))}</h2>
                        </>
                    )}
                    {serviceSourceType === ServiceSourceType.PLUGIN && (
                        <>
                            <img
                                src={pluginList[serviceName].icon}
                                className='h-[24px] w-[24px] my-auto'
                                draggable={false}
                            />
                            <Spacer x={2} />
                            <h2 className='my-auto'>{getDisplayInstanceName(serviceInstanceConfig[INSTANCE_NAME_CONFIG_KEY], () => pluginList[serviceName].display) +  `[${t('common.plugin')}]`}</h2>
                        </>
                    )}
                </div>
                <div className='flex items-center'>
                    {/* Power button: on = translate automatically, off = only when its card is opened */}
                    <Tooltip
                        content={
                            (serviceInstanceConfig['auto'] ?? true)
                                ? t('config.service.auto_on')
                                : t('config.service.auto_off')
                        }
                        delay={400}
                    >
                        <Button
                            isIconOnly
                            size='sm'
                            variant={(serviceInstanceConfig['auto'] ?? true) ? 'flat' : 'light'}
                            color={(serviceInstanceConfig['auto'] ?? true) ? 'primary' : 'default'}
                            isDisabled={!(serviceInstanceConfig['enable'] ?? true)}
                            onPress={() => {
                                setServiceInstanceConfig({
                                    ...serviceInstanceConfig,
                                    auto: !(serviceInstanceConfig['auto'] ?? true),
                                });
                            }}
                        >
                            <LuPower className='text-[17px]' />
                        </Button>
                    </Tooltip>
                    <Spacer x={3} />
                    <Switch
                        size='sm'
                        isSelected={serviceInstanceConfig['enable'] ?? true}
                        onValueChange={(v) => {
                            setServiceInstanceConfig({ ...serviceInstanceConfig, enable: v });
                        }}
                    />
                    <Button
                        isIconOnly
                        size='sm'
                        variant='light'
                        onPress={() => {
                            setCurrentConfigKey(serviceInstanceKey);
                            onConfigOpen();
                        }}
                    >
                        <BiSolidEdit className='text-2xl' />
                    </Button>
                    <Spacer x={2} />
                    <Button
                        isIconOnly
                        size='sm'
                        variant='light'
                        color='danger'
                        onPress={() => {
                            deleteServiceInstance(serviceInstanceKey);
                        }}
                    >
                        <MdDeleteOutline className='text-2xl' />
                    </Button>
                </div>
            </div>
        )
    );
}
