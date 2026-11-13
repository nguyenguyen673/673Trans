import { invoke } from '@tauri-apps/api';

export async function login(clientId, clientSecret) {
    return await invoke('gdrive_login', { clientId, clientSecret });
}

export async function backup(clientId, clientSecret, refreshToken, name) {
    return await invoke('gdrive', { operate: 'put', clientId, clientSecret, refreshToken, name });
}

export async function list(clientId, clientSecret, refreshToken) {
    const text = await invoke('gdrive', { operate: 'list', clientId, clientSecret, refreshToken });
    return JSON.parse(text);
}

export async function get(clientId, clientSecret, refreshToken, name) {
    await invoke('gdrive', { operate: 'get', clientId, clientSecret, refreshToken, name });
}

export async function remove(clientId, clientSecret, refreshToken, name) {
    await invoke('gdrive', { operate: 'delete', clientId, clientSecret, refreshToken, name });
}
