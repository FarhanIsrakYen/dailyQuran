import { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, ScrollView, TextInput, Keyboard
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
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
    onBack: () => void;
}

export default function SearchAyah({ onBack }: Props) {
    const [surahNo, setSurahNo] = useState('');
    const [ayahNo, setAyahNo] = useState('');
    const [ayahData, setAyahData] = useState<AyahData | null>(null);
    const [loading, setLoading] = useState(false);

    const [selectedReciter, setSelectedReciter] = useState('1');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
    const playerStatus = useAudioPlayerStatus(player);

    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true });
    }, []);

    const fetchAyah = async () => {
        const sNo = parseInt(surahNo);
        const aNo = parseInt(ayahNo);

        if (isNaN(sNo) || sNo < 1 || sNo > 114) {
            Alert.alert('Invalid Surah', 'Please enter a Surah number between 1 and 114.');
            return;
        }
        if (isNaN(aNo) || aNo < 1) {
            Alert.alert('Invalid Ayah', 'Please enter a valid Ayah number.');
            return;
        }

        Keyboard.dismiss();
        setLoading(true);
        setAudioUrl(null);
        try {
            const res = await fetch(AYAH_API(sNo, aNo));
            const data: AyahData = await res.json();

            if (!data.arabic1) {
                // If API returns an error or empty
                Alert.alert('Not Found', 'Ayah not found for this Surah.');
                setAyahData(null);
                return;
            }

            setAyahData(data);
            const url = data.audio?.[selectedReciter]?.url ?? null;
            setAudioUrl(url);
        } catch {
            Alert.alert('Not Found', 'Ayah not found for this Surah.');
        } finally {
            setLoading(false);
        }
    };

    const handleReciterChange = (key: string) => {
        if (playerStatus.playing) player.pause();
        setSelectedReciter(key);
        const url = ayahData?.audio?.[key]?.url ?? null;
        setAudioUrl(url);
        if (url) {
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

    const isPlaying = playerStatus.playing;

    const isSajdahAyah = ayahData ? sajdahData.verses.some(
        (v) => v.surahNo === ayahData.surahNo && v.ayahNo === ayahData.ayahNo
    ) : false;

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.dayLabel}>Search Ayah</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchSection}>
                <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Surah No (1-114)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={surahNo}
                            onChangeText={setSurahNo}
                            placeholder="e.g. 1"
                            placeholderTextColor="#5A7A9A"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Ayah No</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={ayahNo}
                            onChangeText={setAyahNo}
                            placeholder="e.g. 1"
                            placeholderTextColor="#5A7A9A"
                        />
                    </View>
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={fetchAyah} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#0D1B2A" />
                    ) : (
                        <Text style={styles.searchBtnText}>Search</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {ayahData ? (
                    <>
                        <View style={styles.surahHeader}>
                            <Text style={styles.surahArabic}>{ayahData.surahNameArabic}</Text>
                            <Text style={styles.surahName}>{ayahData.surahName}</Text>
                            <Text style={styles.surahTranslation}>{ayahData.surahNameTranslation}</Text>
                            <View style={styles.ayahBadge}>
                                <Text style={styles.ayahBadgeText}>{ayahData.surahNo}:{ayahData.ayahNo} (Total: {ayahData.totalAyah})</Text>
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
                    </>
                ) : (
                    !loading && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🔍</Text>
                            <Text style={styles.emptyText}>Enter a Surah and Ayah number above to search.</Text>
                        </View>
                    )
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#132030'
    },
    backBtn: { padding: 4, width: 60 },
    backText: { color: '#8BA7C7', fontSize: 14 },
    dayLabel: { color: '#EAE0D0', fontSize: 16, fontWeight: '500' },
    searchSection: {
        padding: 20, backgroundColor: '#0A1520', borderBottomWidth: 1, borderBottomColor: '#1E3348',
    },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 12, color: '#5A7A9A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#132030', color: '#EAE0D0', padding: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#1E3348', fontSize: 16,
    },
    searchBtn: { backgroundColor: '#C9A96E', padding: 14, borderRadius: 10, alignItems: 'center' },
    searchBtnText: { color: '#0D1B2A', fontSize: 16, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: 16, opacity: 0.5 },
    emptyText: { color: '#5A7A9A', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

    // Read View Styles Replica
    scroll: { padding: 24, paddingBottom: 60 },
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
});
