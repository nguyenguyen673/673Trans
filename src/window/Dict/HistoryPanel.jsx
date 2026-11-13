import { LuX, LuTrash2 } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';

import { loadHistory, removeHistory, clearHistory } from '../../utils/dict_history';

// Recent lookups; typing in the search box filters them
export default function HistoryPanel({ filter, onPick }) {
    const { t } = useTranslation();
    const [list, setList] = useState(null);

    useEffect(() => {
        loadHistory().then(setList);
    }, []);

    const q = (filter ?? '').trim().toLowerCase();
    const shown = (list ?? []).filter((x) => !q || x.w.toLowerCase().includes(q));

    return (
        <div className='dict-history'>
            <div className='dict-history-head'>
                <span>{t('dict.history')}</span>
                {list?.length > 0 && (
                    <button
                        className='dict-link'
                        onClick={async () => {
                            await clearHistory();
                            setList([]);
                        }}
                    >
                        <LuTrash2 /> {t('dict.history_clear')}
                    </button>
                )}
            </div>
            {list !== null && shown.length === 0 && <div className='dict-note'>{t('dict.history_empty')}</div>}
            {shown.slice(0, 200).map((x) => (
                <div
                    className='dict-history-row'
                    key={x.w}
                >
                    <button
                        className='dict-history-word'
                        onClick={() => onPick(x.w)}
                    >
                        {x.w}
                    </button>
                    <button
                        className='dict-icon-btn'
                        onClick={async () => {
                            await removeHistory(x.w);
                            setList((l) => l.filter((y) => y.w !== x.w));
                        }}
                    >
                        <LuX />
                    </button>
                </div>
            ))}
        </div>
    );
}
