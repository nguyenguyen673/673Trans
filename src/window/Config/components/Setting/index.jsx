// Building blocks for settings pages.
//   <Section title='...'>          a titled card
//     <Row label='...' desc='...'> one setting: label (+ small description) left, control right
import { Card, CardBody } from '@nextui-org/react';
import React from 'react';

export function Section({ title, children }) {
    return (
        <>
            {title && <h4 className='config-section-title'>{title}</h4>}
            <Card className='mb-[10px]'>
                <CardBody>{children}</CardBody>
            </Card>
        </>
    );
}

export function Row({ label, desc, children }) {
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
