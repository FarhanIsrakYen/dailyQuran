import { DayPlan } from './storage';

export interface SurahInfo {
    surahName: string;
    surahNameArabic: string;
    surahNameArabicLong: string;
    surahNameTranslation: string;
    revelationPlace: string;
    totalAyah: number;
}

/**
 * Distributes Quran ayahs evenly across the specified number of days.
 * Ensures the last day absorbs any remainder so total sum matches exactly.
 */
export function buildPlan(surahs: SurahInfo[], totalDays: number): DayPlan[] {
    const totalAyah = surahs.reduce((sum, s) => sum + s.totalAyah, 0);
    const ayahPerDay = Math.ceil(totalAyah / totalDays);

    const days: DayPlan[] = [];
    let surahIdx = 0;
    let ayahIdx = 1; // ayah numbers are 1-based
    let remaining = totalAyah;

    for (let day = 1; day <= totalDays; day++) {
        const quota = day === totalDays ? remaining : Math.min(ayahPerDay, remaining);
        let count = 0;
        const startSurah = surahIdx + 1;
        const startAyah = ayahIdx;

        let endSurah = startSurah;
        let endAyah = startAyah;

        while (count < quota && surahIdx < surahs.length) {
            const surah = surahs[surahIdx];
            const ayahsLeft = surah.totalAyah - ayahIdx + 1;

            if (count + ayahsLeft <= quota) {
                // consume entire remaining part of this surah
                endSurah = surahIdx + 1;
                endAyah = surah.totalAyah;
                count += ayahsLeft;
                surahIdx++;
                ayahIdx = 1;
            } else {
                // consume partial surah
                const take = quota - count;
                endSurah = surahIdx + 1;
                endAyah = ayahIdx + take - 1;
                ayahIdx = endAyah + 1;
                count += take;
            }
        }

        days.push({
            day,
            ayahCount: count,
            startSurah,
            startAyah,
            endSurah,
            endAyah,
        });

        remaining -= count;
        if (remaining <= 0) break;
    }

    return days;
}

export const SURAH_API = 'https://quranapi.pages.dev/api/surah.json';
export const AYAH_API = (surah: number, ayah: number) =>
    `https://quranapi.pages.dev/api/${surah}/${ayah}.json`;
