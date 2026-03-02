import { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { storage, Progress, QuranPlan } from '../utils/storage';
import { AYAH_API } from '../utils/planBuilder';
import sajdahData from '../assets/sajdah.json';

interface AyahData {
    surahName: string;
    surahNameArabic: string;
    surahNameTranslation: string;
    totalAyah: number;
    surahNo: number;
    ayahNo: number;
    arabic1: string;
    english: string;
    bengali?: string;
    audio: Record<string, { reciter: string; url: string }>;
}

const RECITERS: Record<string, string> = {
    '1': 'Mishary Al Afasy',
    '2': 'Abu Bakr Al Shatri',
    '3': 'Nasser Al Qatami',
    '4': 'Yasser Al Dosari',
    '5': 'Hani Ar Rifai',
};

interface Props {
    day: number;
    onBack: () => void;
}

export default function Read({ day, onBack }: Props) {
    const [plan, setPlan] = useState<QuranPlan | null>(null);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [ayahData, setAyahData] = useState<AyahData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSurah, setCurrentSurah] = useState(1);
    const [currentAyah, setCurrentAyah] = useState(1);
    const [dayEndSurah, setDayEndSurah] = useState(1);
    const [dayEndAyah, setDayEndAyah] = useState(1);
    const [ayahsDoneToday, setAyahsDoneToday] = useState(0);
    const [dayTotalAyah, setDayTotalAyah] = useState(0);
    const [selectedReciter, setSelectedReciter] = useState('1');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // expo-audio: useAudioPlayer manages its own lifecycle — no manual unload needed
    // Pass null when no audio URL is ready yet
    const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
    const playerStatus = useAudioPlayerStatus(player);

    // Set silent-mode-compatible playback on mount
    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true });
        initRead();
    }, []);

    const initRead = async () => {
        const p = await storage.getPlan();
        const pr = await storage.getProgress();
        if (!p || !pr || !p.days[day - 1]) { onBack(); return; }

        const dayPlan = p.days[day - 1];
        setPlan(p);
        setDayEndSurah(dayPlan.endSurah);
        setDayEndAyah(dayPlan.endAyah);
        setDayTotalAyah(dayPlan.ayahCount);

        const startS = pr.currentSurah || dayPlan.startSurah;
        const startA = pr.currentAyah || dayPlan.startAyah;

        const beyondDay = startS > dayPlan.endSurah ||
            (startS === dayPlan.endSurah && startA > dayPlan.endAyah);
        const beforeDay = startS < dayPlan.startSurah ||
            (startS === dayPlan.startSurah && startA < dayPlan.startAyah);

        const resolvedS = (beyondDay || beforeDay) ? dayPlan.startSurah : startS;
        const resolvedA = (beyondDay || beforeDay) ? dayPlan.startAyah : startA;

        setCurrentSurah(resolvedS);
        setCurrentAyah(resolvedA);
        setProgress(pr);

        // If starting fresh for the day
        let doneToday = pr.ayahsDoneToday || 1;
        if (resolvedS === dayPlan.startSurah && resolvedA === dayPlan.startAyah) {
            doneToday = 1;
        } else if (resolvedS === dayPlan.startSurah && !pr.ayahsDoneToday) {
            doneToday = (resolvedA - dayPlan.startAyah) + 1;
        }

        setAyahsDoneToday(doneToday);
        await fetchAyah(resolvedS, resolvedA);
    };

    const fetchAyah = async (surah: number, ayah: number) => {
        setLoading(true);
        setAudioUrl(null); // clear old audio while loading
        try {
            const res = await fetch(AYAH_API(surah, ayah));
            const data: AyahData = await res.json();
            setAyahData(data);
            // Set audio URL for the current reciter immediately
            const url = data.audio?.[selectedReciter]?.url ?? null;
            setAudioUrl(url);
        } catch {
            Alert.alert('Error', 'Failed to load ayah. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleReciterChange = (key: string) => {
        // Stop current playback, switch reciter, swap audio source via replace()
        if (playerStatus.playing) player.pause();
        setSelectedReciter(key);
        const url = ayahData?.audio?.[key]?.url ?? null;
        setAudioUrl(url);
        if (url) {
            // replace() swaps the audio source on the existing player — no new object needed
            player.replace({ uri: url });
        }
    };

    const handlePlayToggle = () => {
        if (!audioUrl) return;
        if (playerStatus.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    const handleNext = async () => {
        if (!ayahData || !plan || !progress) return;

        const isDayEnd = currentSurah === dayEndSurah && currentAyah === dayEndAyah;
        const newDoneToday = ayahsDoneToday + 1;
        setAyahsDoneToday(newDoneToday);

        if (playerStatus.playing) player.pause();

        let nextS = currentSurah;
        let nextA = currentAyah + 1;
        if (nextA > ayahData.totalAyah) { nextS++; nextA = 1; }

        if (isDayEnd) {
            const updatedProgress: Progress = {
                ...progress,
                completedDays: [...progress.completedDays, day],
                missedDays: progress.missedDays.filter(d => d !== day),
                currentSurah: nextS,
                currentAyah: nextA,
                lastActiveDay: day,
                ayahsDoneToday: 0, // reset for the next day
            };
            await storage.saveProgress(updatedProgress);
            Alert.alert('🌙 Day Complete!', `You've completed Day ${day}!`, [
                { text: 'Continue', onPress: onBack },
            ]);
            return;
        }

        const updatedProgress: Progress = {
            ...progress,
            currentSurah: nextS,
            currentAyah: nextA,
            lastActiveDay: day,
            ayahsDoneToday: newDoneToday,
        };
        await storage.saveProgress(updatedProgress);
        setProgress(updatedProgress);
        setCurrentSurah(nextS);
        setCurrentAyah(nextA);
        await fetchAyah(nextS, nextA);
    };

    if (loading || !ayahData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#C9A96E" />
            </View>
        );
    }

    const progressPercent = dayTotalAyah > 0 ? Math.round((ayahsDoneToday / dayTotalAyah) * 100) : 0;
    const isPlaying = playerStatus.playing;

    const isSajdahAyah = sajdahData.verses.some(
        (v) => v.surahNo === ayahData.surahNo && v.ayahNo === ayahData.ayahNo
    );

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.dayLabel}>Day {day}</Text>
                <Text style={styles.progressLabel}>{ayahsDoneToday}/{dayTotalAyah}</Text>
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.surahHeader}>
                    <Text style={styles.surahArabic}>{ayahData.surahNameArabic}</Text>
                    <Text style={styles.surahName}>{ayahData.surahName}</Text>
                    <Text style={styles.surahTranslation}>{ayahData.surahNameTranslation}</Text>
                    <View style={styles.ayahBadge}>
                        <Text style={styles.ayahBadgeText}>{ayahData.surahNo}:{ayahData.ayahNo}</Text>
                    </View>
                </View>

                {isSajdahAyah && (
                    <View style={styles.sajdahContainer}>
                        <Text style={styles.sajdahTitle}>۩ {sajdahData.sajdah.arabic} ۩</Text>
                        <View style={styles.sajdahLangs}>
                            <Text style={styles.sajdahLangText}>{sajdahData.sajdah.english}</Text>
                            <Text style={styles.sajdahSeparator}>•</Text>
                            <Text style={styles.sajdahLangText}>{sajdahData.sajdah.urdu}</Text>
                            <Text style={styles.sajdahSeparator}>•</Text>
                            <Text style={styles.sajdahLangText}>{sajdahData.sajdah.hindi}</Text>
                            <Text style={styles.sajdahSeparator}>•</Text>
                            <Text style={styles.sajdahLangText}>{sajdahData.sajdah.bangla}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.arabicContainer}>
                    <Text style={styles.arabicText}>{ayahData.arabic1}</Text>
                </View>

                <Text style={styles.englishText}>{ayahData.english}</Text>
                {ayahData.bengali && (
                    <Text style={styles.bengaliText}>{ayahData.bengali}</Text>
                )}

                <View style={styles.audioSection}>
                    <Text style={styles.audioLabel}>Listen</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reciters}>
                        {Object.keys(RECITERS).map(key => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.reciterBtn, selectedReciter === key && styles.reciterBtnActive]}
                                onPress={() => handleReciterChange(key)}
                            >
                                <Text style={[styles.reciterText, selectedReciter === key && styles.reciterTextActive]}>
                                    {RECITERS[key]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.playBtn}
                        onPress={handlePlayToggle}
                        disabled={!audioUrl || playerStatus.isBuffering}
                    >
                        {playerStatus.isBuffering
                            ? <ActivityIndicator color="#0D1B2A" />
                            : <Text style={styles.playBtnText}>{isPlaying ? '⏹ Stop' : '▶ Play'}</Text>
                        }
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <Text style={styles.nextBtnText}>
                        {currentSurah === dayEndSurah && currentAyah === dayEndAyah
                            ? '✓ Complete Day'
                            : 'Next Ayah →'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    },
    backBtn: { padding: 4 },
    backText: { color: '#8BA7C7', fontSize: 14 },
    dayLabel: { color: '#EAE0D0', fontSize: 16, fontWeight: '500' },
    progressLabel: { color: '#5A7A9A', fontSize: 13 },
    progressBar: {
        height: 3, backgroundColor: '#132030', marginHorizontal: 20,
        borderRadius: 2, overflow: 'hidden', marginBottom: 4,
    },
    progressFill: { height: '100%', backgroundColor: '#C9A96E' },
    scroll: { padding: 24, paddingBottom: 120 },
    surahHeader: { alignItems: 'center', marginBottom: 32 },
    surahArabic: { fontSize: 28, color: '#C9A96E', marginBottom: 4 },
    surahName: { fontSize: 20, color: '#EAE0D0', fontWeight: '300' },
    surahTranslation: { fontSize: 13, color: '#5A7A9A', marginTop: 2, fontStyle: 'italic' },
    ayahBadge: {
        backgroundColor: '#132030', borderRadius: 20, paddingHorizontal: 14,
        paddingVertical: 4, marginTop: 12, borderWidth: 1, borderColor: '#1E3348',
    },
    ayahBadgeText: { color: '#8BA7C7', fontSize: 13, letterSpacing: 1 },
    sajdahContainer: {
        backgroundColor: '#1E1A0F', borderRadius: 16, padding: 16, marginBottom: 20,
        borderWidth: 1, borderColor: '#C9A96E', alignItems: 'center',
    },
    sajdahTitle: {
        fontSize: 16, color: '#C9A96E', fontWeight: 'bold', marginBottom: 8,
    },
    sajdahLangs: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
    },
    sajdahLangText: {
        fontSize: 13, color: '#EAE0D0', marginHorizontal: 4,
    },
    sajdahSeparator: {
        fontSize: 13, color: '#5A7A9A', marginHorizontal: 4,
    },
    arabicContainer: {
        backgroundColor: '#0A1520', borderRadius: 20, padding: 28, marginBottom: 20,
        borderWidth: 1, borderColor: '#1E3348', alignItems: 'center', minHeight: 140, justifyContent: 'center',
    },
    arabicText: {
        fontSize: 32, color: '#EAE0D0', textAlign: 'center',
        lineHeight: 54, fontWeight: '500', writingDirection: 'rtl',
    },
    englishText: {
        fontSize: 16, color: '#8BA7C7', textAlign: 'center',
        lineHeight: 26, marginBottom: 16, paddingHorizontal: 8, fontStyle: 'italic',
    },
    bengaliText: {
        fontSize: 16, color: '#A0C0A0', textAlign: 'center',
        lineHeight: 26, marginBottom: 32, paddingHorizontal: 8,
    },
    audioSection: {
        backgroundColor: '#0A1520', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1E3348',
    },
    audioLabel: { fontSize: 11, color: '#5A7A9A', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },
    reciters: { marginBottom: 16 },
    reciterBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#132030', marginRight: 8, borderWidth: 1, borderColor: '#1E3348',
    },
    reciterBtnActive: { backgroundColor: '#1A2D1A', borderColor: '#C9A96E' },
    reciterText: { fontSize: 12, color: '#5A7A9A' },
    reciterTextActive: { color: '#C9A96E' },
    playBtn: { backgroundColor: '#C9A96E', borderRadius: 12, padding: 14, alignItems: 'center' },
    playBtnText: { color: '#0D1B2A', fontSize: 16, fontWeight: '700' },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#0D1B2A', padding: 20, paddingBottom: 36,
        borderTopWidth: 1, borderTopColor: '#132030',
    },
    nextBtn: { backgroundColor: '#C9A96E', borderRadius: 14, padding: 18, alignItems: 'center' },
    nextBtnText: { color: '#0D1B2A', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
