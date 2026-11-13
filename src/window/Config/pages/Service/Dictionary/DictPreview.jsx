// Static preview of the dictionary popup (the real one is src/window/Dict)
import { useTranslation } from 'react-i18next';
import { LuVolume2, LuBookOpen, LuChevronDown, LuX, LuSparkles } from 'react-icons/lu';
import React from 'react';

import '../../../../Dict/style.css';
import PreviewBox from '../../../PreviewBox';

export default function DictPreview() {
    const { t } = useTranslation();
    return (
        <PreviewBox>
            <div className='dict-preview'>
                <div className='dict-root bg-background text-foreground border-1 border-default-200'>
                    <span className='dict-menu'>
                        <LuBookOpen />
                        <span>{t('services.dictionary.wiktionary.title')}</span>
                        <LuChevronDown />
                    </span>
                    <span className='dict-close'>
                        <LuX />
                    </span>
                    <div className='dict-scroll'>
                        <div className='dict-head'>
                            <span className='dict-word'>window</span>
                        </div>
                        <div className='dict-prons'>
                            {[
                                ['UK', '/ˈwɪndəʊ/'],
                                ['US', '/ˈwɪndoʊ/'],
                            ].map(([l, ipa]) => (
                                <span
                                    className='dict-pron'
                                    key={l}
                                >
                                    <b className='dict-accent'>{l}</b>
                                    <span className='dict-ipa'>{ipa}</span>
                                    <span className='dict-speak'>
                                        <LuVolume2 />
                                    </span>
                                </span>
                            ))}
                        </div>
                        <div className='dict-meaning'>
                            <div className='dict-pos'>noun</div>
                            <div className='dict-body'>
                                <p className='dict-def is-main'>An opening in a wall that lets in light and air.</p>
                                <p className='dict-example'>She opened the window.</p>
                            </div>
                        </div>
                        <div className='dict-ai-btn'>
                            <LuSparkles /> {t('dict.ai_title')}
                        </div>
                    </div>
                </div>
            </div>
        </PreviewBox>
    );
}
