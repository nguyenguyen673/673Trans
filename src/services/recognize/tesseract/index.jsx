import Tesseract from 'tesseract.js';
import { Language } from './info';

// English, Vietnamese and Chinese data ships inside the app (public/tessdata); other
// languages are downloaded on first use.
const BUNDLED = ['eng', 'vie', 'chi_sim', 'chi_tra'];
const REMOTE = 'https://pub-f6afb74f13c64cd89561b4714dca1c27.r2.dev';

export async function recognize(base64, language) {
    const {
        data: { text },
    } = await Tesseract.recognize('data:image/png;base64,' + base64, language, {
        workerPath: '/worker.min.js',
        corePath: '/tesseract-core-simd-lstm.wasm.js',
        langPath: BUNDLED.includes(language) ? `${window.location.origin}/tessdata` : REMOTE,
    });
    if (language === Language.zh_cn || language === Language.zh_tw) {
        return text.replaceAll(' ', '').trim();
    } else {
        return text.trim();
    }
}

export * from './Config';
export * from './info';
