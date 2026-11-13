// Hotkeys page. Every row = one action + one global shortcut.
//  - keyboard button: press the combination you want (Esc cancels, Backspace clears)
//  - status: Off (empty) / Active / Failed (another app already uses that combination)
// Rust side: src-tauri/src/hotkey.rs (add a new action there, then add a row here).
import { unregister, isRegistered } from '@tauri-apps/api/globalShortcut';
import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@nextui-org/react';
import { LuKeyboard, LuX, LuPlus, LuArrowRightLeft } from 'react-icons/lu';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';

import { Section } from '../../components/Setting';
import { useConfig } from '../../../../hooks/useConfig';
import { useToastStyle } from '../../../../hooks';
import { languageList } from '../../../../utils/language';
import { osType } from '../../../../utils/env';

const keyMap = {
    Backquote: '`',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Comma: ',',
    Equal: '=',
    Minus: '-',
    Plus: 'PLUS',
    Period: '.',
    Quote: "'",
    Semicolon: ';',
    Slash: '/',
    Backspace: 'Backspace',
    CapsLock: 'Capslock',
    ContextMenu: 'Contextmenu',
    Space: 'Space',
    Tab: 'Tab',
    Convert: 'Convert',
    Delete: 'Delete',
    End: 'End',
    Help: 'Help',
    Home: 'Home',
    PageDown: 'Pagedown',
    PageUp: 'Pageup',
    PrintScreen: 'Printscreen',
    ScrollLock: 'Scrolllock',
    Pause: 'Pause',
    Insert: 'Insert',
    Suspend: 'Suspend',
};

// KeyboardEvent -> "Ctrl+Shift+Q" (empty while only modifiers are held)
function comboFromEvent(e) {
    let mods = [];
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.shiftKey) mods.push('Shift');
    if (e.metaKey) mods.push(osType === 'Darwin' ? 'Command' : 'Super');
    if (e.altKey) mods.push('Alt');
    let code = e.code;
    if (code.startsWith('Key')) code = code.substring(3);
    else if (code.startsWith('Digit')) code = code.substring(5);
    else if (code.startsWith('Numpad')) code = 'Num' + code.substring(6);
    else if (code.startsWith('Arrow')) code = code.substring(5);
    else if (code.startsWith('Intl')) code = code.substring(4);
    else if (/^F\d+$/.test(code)) {
        // F1..F24 as is
    } else if (keyMap[code] !== undefined) code = keyMap[code];
    else return '';
    return [...mods, code].join('+');
}

// The shortcut, record / clear buttons and status chip
function HotkeyControl({ value, onSet }) {
    const { t } = useTranslation();
    const [recording, setRecording] = useState(false);
    const [status, setStatus] = useState('off');

    useEffect(() => {
        if (!value) {
            setStatus('off');
            return;
        }
        let alive = true;
        isRegistered(value)
            .then((ok) => alive && setStatus(ok ? 'on' : 'failed'))
            .catch(() => alive && setStatus('failed'));
        return () => {
            alive = false;
        };
    }, [value]);

    useEffect(() => {
        if (!recording) return;
        const onKey = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
                setRecording(false);
                return;
            }
            if (e.key === 'Backspace') {
                setRecording(false);
                onSet('', value);
                return;
            }
            const combo = comboFromEvent(e);
            if (!combo) return;
            setRecording(false);
            onSet(combo, value);
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [recording, value, onSet]);

    const statusChip = {
        off: { color: 'default', text: t('config.hotkey.status_off') },
        on: { color: 'success', text: t('config.hotkey.status_on') },
        failed: { color: 'danger', text: t('config.hotkey.status_failed') },
    }[status];

    return (
        <div className='hotkey-control'>
            <div
                className={`hotkey-keys ${recording ? 'is-recording' : ''}`}
                onClick={() => setRecording(true)}
            >
                {recording ? (
                    <span className='hotkey-hint'>{t('config.hotkey.press_keys')}</span>
                ) : value ? (
                    value.split('+').map((k, i) => (
                        <kbd
                            key={i}
                            className='hotkey-kbd'
                        >
                            {k === 'PLUS' ? '+' : k}
                        </kbd>
                    ))
                ) : (
                    <span className='hotkey-hint'>{t('config.hotkey.not_set')}</span>
                )}
            </div>
            <Button
                size='sm'
                className='hotkey-btn'
                variant={recording ? 'solid' : 'flat'}
                color='primary'
                startContent={<LuKeyboard />}
                onPress={() => setRecording(!recording)}
            >
                {recording ? t('config.hotkey.cancel') : value ? t('config.hotkey.change') : t('config.hotkey.assign')}
            </Button>
            <Button
                size='sm'
                className='hotkey-btn'
                variant='flat'
                color='danger'
                startContent={<LuX />}
                isDisabled={!value}
                onPress={() => onSet('', value)}
            >
                {t('config.hotkey.clear_short')}
            </Button>
            <Chip
                size='sm'
                variant='flat'
                color={statusChip.color}
                className='hotkey-status'
            >
                {statusChip.text}
            </Chip>
        </div>
    );
}

function Row({ label, desc, children }) {
    return (
        <div className='config-item'>
            <div className='config-label'>
                <h3>{label}</h3>
                {desc && <p className='config-desc'>{desc}</p>}
            </div>
            {children}
        </div>
    );
}

// One action: saved in the config key `name`, registered by Rust
function HotkeyRow({ name, label, desc }) {
    const [value, setValue] = useConfig(name, '');
    const toastStyle = useToastStyle();
    const { t } = useTranslation();

    const onSet = async (next, old) => {
        if (old) await unregister(old).catch(() => {});
        if (!next) {
            setValue('');
            return;
        }
        let ok = false;
        if (await isRegistered(next).catch(() => false)) {
            toast.error(t('config.hotkey.is_register'), { style: toastStyle });
        } else {
            try {
                await invoke('register_shortcut_by_frontend', { name, shortcut: next });
                ok = true;
            } catch (e) {
                toast.error(String(e), { style: toastStyle });
            }
        }
        // Keep what the user chose even if it failed, so the Failed chip shows
        setValue(next);
        if (ok) toast.success(t('config.hotkey.success'), { style: toastStyle });
    };

    return (
        <Row
            label={label}
            desc={desc}
        >
            {value !== null && (
                <HotkeyControl
                    value={value}
                    onSet={onSet}
                />
            )}
        </Row>
    );
}

function LanguageButton({ code, onPick }) {
    const { t } = useTranslation();
    return (
        <Dropdown>
            <DropdownTrigger>
                <Button
                    size='sm'
                    variant='bordered'
                >
                    {t(`languages.${code}`)}
                </Button>
            </DropdownTrigger>
            <DropdownMenu
                aria-label='language'
                className='max-h-[50vh] overflow-y-auto'
                onAction={onPick}
            >
                {languageList.map((item) => (
                    <DropdownItem key={item}>{t(`languages.${item}`)}</DropdownItem>
                ))}
            </DropdownMenu>
        </Dropdown>
    );
}

// Language pairs: one hotkey sets the target language and the backup language
function LanguagePairs() {
    const { t } = useTranslation();
    const toastStyle = useToastStyle();
    const [pairs, setPairs] = useConfig('translate_language_pairs', []);

    if (pairs === null) return null;

    const registerPair = async (pair) => {
        if (!pair.hotkey) return;
        try {
            await invoke('register_language_pair_hotkey', {
                shortcut: pair.hotkey,
                target: pair.target,
                second: pair.second,
            });
        } catch (e) {
            toast.error(String(e), { style: toastStyle });
        }
    };
    const update = async (index, patch) => {
        const old = pairs[index];
        const next = { ...old, ...patch };
        if (old.hotkey) await unregister(old.hotkey).catch(() => {});
        if (next.hotkey && (await isRegistered(next.hotkey).catch(() => false))) {
            toast.error(t('config.hotkey.is_register'), { style: toastStyle });
        } else {
            await registerPair(next);
        }
        setPairs(pairs.map((p, i) => (i === index ? next : p)));
    };
    const remove = async (index) => {
        const old = pairs[index];
        if (old.hotkey) await unregister(old.hotkey).catch(() => {});
        setPairs(pairs.filter((_, i) => i !== index));
    };

    return (
        <Section title={t('config.hotkey.pairs')}>
            {pairs.length === 0 && <p className='config-desc py-2'>{t('config.hotkey.pairs_empty')}</p>}
            {pairs.map((pair, index) => (
                <div
                    className='config-item'
                    key={index}
                >
                    <div className='hotkey-pair'>
                        <LanguageButton
                            code={pair.target}
                            onPick={(k) => update(index, { target: k })}
                        />
                        <LuArrowRightLeft className='text-default-400' />
                        <LanguageButton
                            code={pair.second}
                            onPick={(k) => update(index, { second: k })}
                        />
                    </div>
                    <div className='flex items-center gap-2'>
                        <HotkeyControl
                            value={pair.hotkey}
                            onSet={(next) => update(index, { hotkey: next })}
                        />
                        <Button
                            isIconOnly
                            size='sm'
                            variant='flat'
                            color='danger'
                            title={t('config.hotkey.remove_pair')}
                            onPress={() => remove(index)}
                        >
                            <LuX />
                        </Button>
                    </div>
                </div>
            ))}
            <div className='flex justify-end pt-2'>
                <Button
                    size='sm'
                    variant='flat'
                    startContent={<LuPlus />}
                    onPress={() => setPairs([...pairs, { target: 'vi', second: 'en', hotkey: '' }])}
                >
                    {t('config.hotkey.add_pair')}
                </Button>
            </div>
        </Section>
    );
}

export default function Hotkey() {
    const { t } = useTranslation();
    const h = (key) => t(`config.hotkey.${key}`);
    return (
        <>
            <Toaster />
            <Section title={h('group_general')}>
                <HotkeyRow
                    name='hotkey_toggle_all'
                    label={h('toggle_all')}
                    desc={h('toggle_all_desc')}
                />
                <HotkeyRow
                    name='hotkey_toggle_toolbar'
                    label={h('toggle_toolbar')}
                />
            </Section>
            <Section title={h('group_input')}>
                <HotkeyRow
                    name='hotkey_input_translate'
                    label={h('input_translate')}
                />
            </Section>
            <Section title={h('group_selection')}>
                <HotkeyRow
                    name='hotkey_selection_translate'
                    label={h('selection_translate')}
                />
                <HotkeyRow
                    name='hotkey_selection_translate_copy'
                    label={h('selection_translate_copy')}
                />
                <HotkeyRow
                    name='hotkey_selection_replace'
                    label={h('selection_replace')}
                />
                <HotkeyRow
                    name='hotkey_selection_speak'
                    label={h('selection_speak')}
                />
                <HotkeyRow
                    name='hotkey_selection_dictionary'
                    label={h('selection_dictionary')}
                />
                <HotkeyRow
                    name='hotkey_dictionary_input'
                    label={h('dictionary_input')}
                />
            </Section>
            <Section title={h('group_screenshot')}>
                <HotkeyRow
                    name='hotkey_ocr_recognize'
                    label={h('ocr_recognize')}
                />
                <HotkeyRow
                    name='hotkey_ocr_translate'
                    label={h('ocr_translate')}
                />
                <HotkeyRow
                    name='hotkey_ocr_copy'
                    label={h('ocr_copy')}
                />
                <HotkeyRow
                    name='hotkey_ocr_translate_copy'
                    label={h('ocr_translate_copy')}
                />
            </Section>
            <LanguagePairs />
        </>
    );
}
