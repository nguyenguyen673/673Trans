import { readTextFile, BaseDirectory } from '@tauri-apps/api/fs';
import { DropdownTrigger } from '@nextui-org/react';
import { useDisclosure } from '@nextui-org/react';
import toast, { Toaster } from 'react-hot-toast';
import { DropdownMenu } from '@nextui-org/react';
import { DropdownItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { CardBody } from '@nextui-org/react';
import { Dropdown } from '@nextui-org/react';
import { warn } from 'tauri-plugin-log-api';
import { Button } from '@nextui-org/react';
import { Input } from '@nextui-org/react';
import { Card } from '@nextui-org/react';
import React, { useEffect, useState } from 'react';

import { useConfig, useToastStyle } from '../../../../hooks';
import { osType } from '../../../../utils/env';
import * as webdav from './utils/webdav';
import WebDavModal from './WebDavModal';
import GDriveModal from './GDriveModal';
import * as local from './utils/local';
import * as gdrive from './utils/gdrive';

export default function Backup() {
    const [backupType, setBackupType] = useConfig('backup_type', 'webdav');
    const [davUserName, setDavUserName] = useConfig('webdav_username', '');
    const [davPassword, setDavPassword] = useConfig('webdav_password', '');
    const [davUrl, setDavUrl] = useConfig('webdav_url', '');
    const [gdriveClientId, setGdriveClientId] = useConfig('gdrive_client_id', '');
    const [gdriveClientSecret, setGdriveClientSecret] = useConfig('gdrive_client_secret', '');
    const [gdriveRefreshToken, setGdriveRefreshToken] = useConfig('gdrive_refresh_token', '');
    const [signingIn, setSigningIn] = useState(false);
    const {
        isOpen: isWebDavListOpen,
        onOpen: onWebDavListOpen,
        onOpenChange: onWebDavListOpenChange,
    } = useDisclosure();
    const {
        isOpen: isGDriveListOpen,
        onOpen: onGDriveListOpen,
        onOpenChange: onGDriveListOpenChange,
    } = useDisclosure();
    const [uploading, setUploading] = useState(false);
    const toastStyle = useToastStyle();
    const { t } = useTranslation();

    const onBackup = async () => {
        setUploading(true);
        const time = new Date();
        const fileName = `${osType}-${time.getFullYear()}-${
            time.getMonth() + 1
        }-${time.getDate()}-${time.getHours()}-${time.getMinutes()}-${time.getSeconds()}`;

        let result;
        switch (backupType) {
            case 'webdav':
                result = webdav.backup(davUrl, davUserName, davPassword, fileName + '.zip');
                break;
            case 'local':
                result = local.backup(fileName);
                break;
            case 'gdrive':
                if (!gdriveRefreshToken) {
                    toast.error(t('config.backup.gdrive_login_first'), { style: toastStyle });
                    setUploading(false);
                    return;
                }
                result = gdrive.backup(gdriveClientId, gdriveClientSecret, gdriveRefreshToken, fileName + '.zip');
                break;
            default:
                warn('Unknown backup type');
                return;
        }
        result.then(
            () => {
                toast.success(t('config.backup.backup_success'), { style: toastStyle });
                setUploading(false);
            },
            (e) => {
                toast.error(e.toString(), { style: toastStyle });
                setUploading(false);
            }
        );
    };

    const onBackupListOpen = () => {
        switch (backupType) {
            case 'webdav':
                onWebDavListOpen();
                break;
            case 'local':
                local.get().then(
                    () => {
                        toast.success(t('config.backup.load_success'), { style: toastStyle });
                    },
                    (e) => {
                        toast.error(e.toString(), { style: toastStyle });
                    }
                );
                break;
            case 'gdrive':
                if (!gdriveRefreshToken) {
                    toast.error(t('config.backup.gdrive_login_first'), { style: toastStyle });
                } else {
                    onGDriveListOpen();
                }
                break;
            default:
                warn('Unknown backup type');
        }
    };

    const onGDriveLogin = async () => {
        setSigningIn(true);
        try {
            const token = await gdrive.login(gdriveClientId, gdriveClientSecret);
            setGdriveRefreshToken(token);
            toast.success(t('config.backup.login_success'), { style: toastStyle });
        } catch (e) {
            toast.error(e.toString(), { style: toastStyle });
        }
        setSigningIn(false);
    };

    useEffect(() => {
        // Aliyun backup was removed; fall back to WebDav for anyone who had it selected
        if (backupType === 'aliyun') setBackupType('webdav');
    }, [backupType]);

    return (
        <Card className='mb-[10px]'>
            <Toaster />
            <CardBody>
                <div className='config-item'>
                    <h3 className='my-auto'>{t('config.backup.type')}</h3>
                    {backupType !== null && backupType !== 'aliyun' && (
                        <Dropdown>
                            <DropdownTrigger>
                                <Button variant='bordered'>{t(`config.backup.${backupType}`)}</Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                aria-label='backup type'
                                onAction={(key) => {
                                    setBackupType(key);
                                }}
                            >
                                <DropdownItem key='webdav'>{t('config.backup.webdav')}</DropdownItem>
                                <DropdownItem key='gdrive'>{t('config.backup.gdrive')}</DropdownItem>
                                <DropdownItem key='local'>{t('config.backup.local')}</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    )}
                </div>
                <div className={backupType !== 'webdav' ? 'hidden' : ''}>
                    <div className='config-item'>
                        <h3 className='my-auto'>{t('config.backup.webdav_url')}</h3>
                        {davUrl !== null && (
                            <Input
                                variant='bordered'
                                value={davUrl}
                                label={t('config.backup.webdav_url')}
                                onValueChange={(v) => {
                                    setDavUrl(v);
                                }}
                                className='max-w-[300px]'
                            />
                        )}
                    </div>
                    <div className='config-item'>
                        <h3 className='my-auto'>{t('config.backup.username')}</h3>
                        {davUserName !== null && (
                            <Input
                                variant='bordered'
                                value={davUserName}
                                label={t('config.backup.username')}
                                onValueChange={(v) => {
                                    setDavUserName(v);
                                }}
                                className='max-w-[300px]'
                            />
                        )}
                    </div>
                    <div className='config-item'>
                        <h3 className='my-auto'>{t('config.backup.password')}</h3>
                        {davPassword !== null && (
                            <Input
                                type='password'
                                variant='bordered'
                                value={davPassword}
                                label={t('config.backup.password')}
                                onValueChange={(v) => {
                                    setDavPassword(v);
                                }}
                                className='max-w-[300px]'
                            />
                        )}
                    </div>
                </div>
                <div className={backupType !== 'gdrive' ? 'hidden' : ''}>
                    <p className='text-xs text-default-500 mb-2'>{t('config.backup.gdrive_hint')}</p>
                    <div className='config-item'>
                        <h3 className='my-auto'>Client ID</h3>
                        {gdriveClientId !== null && (
                            <Input
                                variant='bordered'
                                value={gdriveClientId}
                                label='Client ID'
                                onValueChange={(v) => {
                                    setGdriveClientId(v);
                                }}
                                className='max-w-[300px]'
                            />
                        )}
                    </div>
                    <div className='config-item'>
                        <h3 className='my-auto'>Client Secret</h3>
                        {gdriveClientSecret !== null && (
                            <Input
                                type='password'
                                variant='bordered'
                                value={gdriveClientSecret}
                                label='Client Secret'
                                onValueChange={(v) => {
                                    setGdriveClientSecret(v);
                                }}
                                className='max-w-[300px]'
                            />
                        )}
                    </div>
                    <div className='config-item'>
                        <h3 className='my-auto'>
                            {gdriveRefreshToken ? t('config.backup.gdrive_logged_in') : t('config.backup.gdrive_not_logged_in')}
                        </h3>
                        <div className='flex gap-2'>
                            <Button
                                color='primary'
                                variant='flat'
                                isLoading={signingIn}
                                onPress={onGDriveLogin}
                            >
                                {t('config.backup.gdrive_login')}
                            </Button>
                            {gdriveRefreshToken && (
                                <Button
                                    variant='light'
                                    onPress={() => {
                                        setGdriveRefreshToken('');
                                    }}
                                >
                                    {t('config.backup.logout')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <div className='flex justify-around'>
                    <Button
                        color='success'
                        variant='flat'
                        isLoading={uploading}
                        onPress={onBackup}
                    >
                        {t('config.backup.backup')}
                    </Button>
                    <Button
                        color='primary'
                        variant='flat'
                        onPress={onBackupListOpen}
                    >
                        {t('config.backup.restore')}
                    </Button>
                </div>
            </CardBody>
            <WebDavModal
                isOpen={isWebDavListOpen}
                onOpenChange={onWebDavListOpenChange}
                url={davUrl}
                username={davUserName}
                password={davPassword}
            />
            <GDriveModal
                isOpen={isGDriveListOpen}
                onOpenChange={onGDriveListOpenChange}
                clientId={gdriveClientId}
                clientSecret={gdriveClientSecret}
                refreshToken={gdriveRefreshToken}
            />
        </Card>
    );
}
