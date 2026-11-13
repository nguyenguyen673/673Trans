import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import { store } from '../utils/store';
import { useConfig } from './useConfig';

// Instances whose switch (Config > Services) is off have `enable: false` in their config
export async function filterEnabled(list) {
    if (!Array.isArray(list)) return list;
    const out = [];
    for (const key of list) {
        const cfg = (await store.get(key)) ?? {};
        if (cfg['enable'] === false || cfg['enable'] === 'false') continue;
        out.push(key);
    }
    return out;
}

// Same as reading a service list with useConfig, minus the switched-off instances
export function useEnabledList(key, defaultValue) {
    const [list] = useConfig(key, defaultValue);
    const [enabled, setEnabled] = useState(null);

    useEffect(() => {
        if (list === null) return;
        let alive = true;
        const refresh = async () => {
            await store.load();
            const f = await filterEnabled(list);
            if (alive) setEnabled(f);
        };
        refresh();
        // the switches live in another window: re-check whenever this one gets focus
        const un = listen('tauri://focus', refresh);
        return () => {
            alive = false;
            un.then((f) => f());
        };
    }, [JSON.stringify(list)]);

    return [enabled];
}
