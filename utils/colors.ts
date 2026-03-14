export type ThemeType = 'dark' | 'light';

export interface ThemeColors {
    background: string;
    text: string;
    subtext: string;
    card: string;
    accent: string;
    border: string;
    progressBg: string;
    footer: string;
    nextBtn: string;
    nextBtnText: string;
    sajdahBg: string;
    arabicBg: string;
    bengali: string;
}

export const COLORS: Record<ThemeType, ThemeColors> = {
    dark: {
        background: '#0D1B2A',
        text: '#EAE0D0',
        subtext: '#5A7A9A',
        card: '#132030',
        accent: '#C9A96E',
        border: '#1E3348',
        progressBg: '#132030',
        footer: '#0D1B2A',
        nextBtn: '#C9A96E',
        nextBtnText: '#0D1B2A',
        sajdahBg: '#1E1A0F',
        arabicBg: '#0A1520',
        bengali: '#A0C0A0',
    },
    light: {
        background: '#FFFFFF',
        text: '#000000',
        subtext: '#666666',
        card: '#F5F5F5',
        accent: '#C9A96E',
        border: '#DDDDDD',
        progressBg: '#EEEEEE',
        footer: '#FFFFFF',
        nextBtn: '#C9A96E',
        nextBtnText: '#FFFFFF',
        sajdahBg: '#FFF9E6',
        arabicBg: '#FAFAFA',
        bengali: '#4F7942',
    },
};
