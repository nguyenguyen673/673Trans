// tailwind.config.js
const { nextui } = require('@nextui-org/react');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        // ...
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {},
    },
    darkMode: 'class',
    plugins: [
        nextui({
            themes: {
                // 673Trans palette. Change `primary` to re-colour switches, links and highlights.
                dark: {
                    colors: {
                        background: '#131316',
                        foreground: '#ececf1',
                        content1: '#1b1b20',
                        content2: '#24242b',
                        content3: '#2e2e37',
                        content4: '#3a3a45',
                        default: {
                            DEFAULT: '#3a3a45',
                            50: '#1b1b20',
                            100: '#26262e',
                            200: '#32323c',
                            300: '#44444f',
                            400: '#5d5d6b',
                            500: '#9a9aa8',
                            600: '#b1b1bd',
                            700: '#c6c6d0',
                            800: '#dadae1',
                            900: '#ececf1',
                        },
                        primary: {
                            DEFAULT: '#bff03a',
                            foreground: '#0b2a12',
                        },
                    },
                },
                light: {
                    colors: {
                        background: '#f6f6f8',
                        foreground: '#17171c',
                        content1: '#ffffff',
                        content2: '#f0f0f4',
                        content3: '#e4e4ea',
                        content4: '#d5d5de',
                        default: {
                            DEFAULT: '#d5d5de',
                            50: '#f6f6f8',
                            100: '#ebebf0',
                            200: '#dcdce4',
                            300: '#c3c3ce',
                            400: '#9d9dab',
                            500: '#6c6c7a',
                            600: '#54545f',
                            700: '#3f3f48',
                            800: '#2a2a31',
                            900: '#17171c',
                        },
                        primary: {
                            DEFAULT: '#8fc90d',
                            foreground: '#0b2a12',
                        },
                    },
                },
            },
        }),
    ],
};
