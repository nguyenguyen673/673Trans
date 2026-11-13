// Run OCR on the last screenshot with the first OCR service (same choice as the
// translate window). Used by the "OCR and copy" hotkeys, which show no window.
import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api';

import { getServiceName, getServiceSouceType, ServiceSourceType } from './service_instance';
import * as builtinRecognizeServices from '../services/recognize';
import { invoke_plugin } from './invoke_plugin';
import { store } from './store';

export async function recognizeScreenshot() {
    const base64 = await invoke('get_base64');
    const list = (await store.get('recognize_service_list')) ?? ['system', 'tesseract'];
    const language = (await store.get('recognize_language')) ?? 'auto';
    const deleteNewline = (await store.get('translate_delete_newline')) ?? false;
    const instanceKey = list[0];
    if (!instanceKey) throw new Error('No OCR service configured');
    const name = getServiceName(instanceKey);
    const config = (await store.get(instanceKey)) ?? {};
    let text;
    if (getServiceSouceType(instanceKey) === ServiceSourceType.PLUGIN) {
        const info = JSON.parse(
            await readTextFile(`plugins/recognize/${name}/info.json`, { dir: BaseDirectory.AppConfig })
        );
        if (!(language in info.language)) throw new Error('Language not supported');
        const [func, utils] = await invoke_plugin('recognize', name);
        text = await func(base64, info.language[language], { config, utils });
    } else {
        const service = builtinRecognizeServices[name];
        if (!service || !(language in service.Language)) throw new Error('Language not supported');
        text = await service.recognize(base64, service.Language[language], { config });
    }
    text = String(text ?? '').trim();
    if (deleteNewline) text = text.replace(/\-\s+/g, '').replace(/\s+/g, ' ');
    if (!text) throw new Error('No text found');
    return text;
}
