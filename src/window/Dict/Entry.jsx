// The body of a dictionary entry: meanings (all services) or the Vietnamese -> English list
import React from 'react';

function Example({ ex }) {
    return <p className='dict-example'>{typeof ex === 'string' ? ex : ex.vi ? `${ex.en} — ${ex.vi}` : ex.en}</p>;
}

export function Meanings({ entry }) {
    return (entry.meanings ?? []).map((m, i) => (
        <div
            className='dict-meaning'
            key={i}
        >
            <div className='dict-pos'>{m.partOfSpeech}</div>
            <div className='dict-body'>
                {/* Wiktionary: one gloss per sense with its own examples */}
                {(m.senses ?? []).map((sn, j) => (
                    <div
                        className='dict-sense'
                        key={`s${j}`}
                    >
                        <p className={j === 0 ? 'dict-def is-main' : 'dict-def'}>{sn.gloss}</p>
                        {sn.examples.map((ex, k) => (
                            <Example
                                ex={ex}
                                key={k}
                            />
                        ))}
                    </div>
                ))}
                {/* Offline / AI: a list of definitions, then examples */}
                {(m.definitions ?? []).map((d, j) => (
                    <p
                        className={j === 0 ? 'dict-def is-main' : 'dict-def'}
                        key={j}
                    >
                        {d}
                    </p>
                ))}
                {(m.examples ?? []).slice(0, 3).map((ex, j) => (
                    <Example
                        ex={ex}
                        key={j}
                    />
                ))}
            </div>
        </div>
    ));
}

export function ReverseList({ entry, onPick }) {
    return (
        <div className='dict-reverse'>
            {entry.reverse.map((r) => (
                <button
                    key={r.word}
                    className='dict-rev'
                    onClick={() => onPick(r.word)}
                >
                    <b>{r.word}</b>
                    <span>{r.gloss}</span>
                </button>
            ))}
        </div>
    );
}

// A short text of the entry for the vocabulary book (Anki / Eudic): "noun: a; b"
export function entrySummary(entry) {
    return (entry.meanings ?? [])
        .slice(0, 4)
        .map((m) => {
            const defs = (m.definitions ?? m.senses?.map((s) => s.gloss) ?? []).slice(0, 3).join('; ');
            return m.partOfSpeech ? `${m.partOfSpeech}: ${defs}` : defs;
        })
        .join('\n');
}
