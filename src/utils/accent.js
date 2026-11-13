// Accent colours offered in Config > General. [hue, saturation %, lightness % (dark), lightness % (light)]
export const ACCENTS = {
    violet: [245, 100, 76, 58],
    blue: [214, 95, 64, 50],
    cyan: [189, 78, 55, 38],
    green: [152, 62, 50, 36],
    orange: [24, 92, 58, 46],
    red: [350, 85, 64, 52],
    pink: [322, 80, 66, 52],
    gray: [240, 5, 82, 30],
};
export const DEFAULT_ACCENT = 'violet';

// Overrides the NextUI theme variables (see tailwind.config.cjs) on <html>
export function applyAccent(name, isDark) {
    const [h, s, dark, light] = ACCENTS[name] ?? ACCENTS[DEFAULT_ACCENT];
    const l = isDark ? dark : light;
    const style = document.documentElement.style;
    style.setProperty('--nextui-primary', `${h} ${s}% ${l}%`);
    style.setProperty('--nextui-focus', `${h} ${s}% ${l}%`);
    style.setProperty('--nextui-primary-foreground', isDark ? '240 14% 7%' : '0 0% 100%');
}

export function accentCss(name, isDark) {
    const [h, s, dark, light] = ACCENTS[name] ?? ACCENTS[DEFAULT_ACCENT];
    return `hsl(${h} ${s}% ${isDark ? dark : light}%)`;
}
