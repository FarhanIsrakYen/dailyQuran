import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    Modal,
    FlatList,
} from 'react-native';
import { storage, DayPlan } from '../utils/storage';
import { buildPlan, SurahInfo } from '../utils/planBuilder';
import { ThemeType, COLORS } from '../utils/colors';

const PRESET_DAYS = [30, 60, 90, 120, 180, 365];

interface Props {
    onComplete: () => void;
    theme: ThemeType;
}

export default function Setup({ onComplete, theme }: Props) {
    const [surahs, setSurahs] = useState<SurahInfo[]>([]);
    const [totalAyah, setTotalAyah] = useState(0);
    const [days, setDays] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewPlan, setPreviewPlan] = useState<DayPlan[]>([]);

    useEffect(() => {
        setDays('');
        setShowPreview(false);
        try {
            const data: SurahInfo[] = require('../assets/surah.json');
            setSurahs(data);
            setTotalAyah(data.reduce((s, su) => s + su.totalAyah, 0));
        } catch (e) {
            Alert.alert('Error', 'Failed to load local Quran data.');
        } finally {
            setLoading(false);
        }
    }, []);

    const parsedDays = parseInt(days, 10);
    const isValidDays = !isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 3650;
    const ayahPerDay = isValidDays ? Math.ceil(totalAyah / parsedDays) : 0;

    const handlePreview = () => {
        if (!isValidDays) {
            Alert.alert('Invalid Input', 'Please enter a number between 1 and 3650.');
            return;
        }
        const plan = buildPlan(surahs, parsedDays);
        setPreviewPlan(plan);
        setShowPreview(true);
    };

    const handleConfirm = async () => {
        setCreating(true);
        setShowPreview(false);
        try {
            const plan = {
                totalDays: parsedDays,
                totalAyah,
                days: previewPlan,
                createdAt: new Date().toISOString(),
            };
            const progress = {
                completedDays: [],
                missedDays: [],
                currentSurah: previewPlan[0]?.startSurah ?? 1,
                currentAyah: previewPlan[0]?.startAyah ?? 1,
                lastActiveDay: null,
                dayStartTimes: {},
            };
            await storage.savePlan(plan);
            await storage.saveProgress(progress);
            await storage.setStarted(true);
            onComplete();
        } catch {
            Alert.alert('Error', 'Failed to create plan. Try again.');
            setCreating(false);
        }
    };

    const themeColors = COLORS[theme];
    const isDark = theme === 'dark';

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
                <Text style={[styles.loadingText, { color: themeColors.subtext }]}>Loading Quran data…</Text>
            </View>
        );
    }

    // FIX: Replaced root <> fragment with <View flex:1> to prevent Android Modal dismiss issues
    return (
        <View style={[styles.flex, { backgroundColor: themeColors.background }]}>
            <ScrollView contentContainerStyle={[styles.container, { backgroundColor: themeColors.background }]} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={[styles.arabic, { color: themeColors.accent }]}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
                    <Text style={[styles.title, { color: themeColors.text }]}>Quran Daily</Text>
                    <Text style={[styles.subtitle, { color: themeColors.subtext }]}>Build a consistent reading routine</Text>
                </View>

                <View style={[styles.statsRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <View style={styles.statCard}>
                        <Text style={[styles.statNumber, { color: themeColors.accent }]}>114</Text>
                        <Text style={[styles.statLabel, { color: themeColors.subtext }]}>Surahs</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
                    <View style={styles.statCard}>
                        <Text style={[styles.statNumber, { color: themeColors.accent }]}>{totalAyah.toLocaleString()}</Text>
                        <Text style={[styles.statLabel, { color: themeColors.subtext }]}>Total Ayahs</Text>
                    </View>
                </View>

                <Text style={[styles.sectionLabel, { color: themeColors.subtext }]}>Quick presets</Text>
                <View style={styles.presets}>
                    {PRESET_DAYS.map(d => (
                        <TouchableOpacity
                            key={d}
                            style={[
                                styles.preset, 
                                { backgroundColor: themeColors.card, borderColor: themeColors.border },
                                days === String(d) && (isDark ? styles.presetActiveDark : styles.presetActiveLight)
                            ]}
                            onPress={() => setDays(String(d))}
                        >
                            <Text style={[styles.presetNum, { color: themeColors.text }, days === String(d) && styles.presetNumActive]}>{d}</Text>
                            <Text style={[styles.presetDayLabel, { color: themeColors.subtext }, days === String(d) && styles.presetDayLabelActive]}>days</Text>
                            {totalAyah > 0 && (
                                <Text style={[styles.presetAyah, days === String(d) && styles.presetAyahActive]}>
                                    ~{Math.ceil(totalAyah / d)}/day
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.sectionLabel, { color: themeColors.subtext }]}>Custom number of days</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }, isValidDays && styles.inputActive]}
                    value={days}
                    onChangeText={setDays}
                    placeholder="Enter days (e.g. 45)"
                    placeholderTextColor={themeColors.subtext}
                    keyboardType="numeric"
                    maxLength={4}
                    selectionColor={themeColors.accent}
                />

                {isValidDays && (
                    <View style={[styles.livePreview, { backgroundColor: themeColors.sajdahBg, borderColor: themeColors.accent }]}>
                        <View style={styles.livePreviewItem}>
                            <Text style={[styles.livePreviewNum, { color: themeColors.accent }]}>{parsedDays}</Text>
                            <Text style={[styles.livePreviewLabel, { color: isDark ? '#5A8A5A' : '#4F7942' }]}>days</Text>
                        </View>
                        <View style={[styles.livePreviewDivider, { backgroundColor: isDark ? '#1E4A1E' : '#C8E6C9' }]} />
                        <View style={styles.livePreviewItem}>
                            <Text style={[styles.livePreviewNum, { color: themeColors.accent }]}>~{ayahPerDay}</Text>
                            <Text style={[styles.livePreviewLabel, { color: isDark ? '#5A8A5A' : '#4F7942' }]}>ayahs/day</Text>
                        </View>
                        <View style={[styles.livePreviewDivider, { backgroundColor: isDark ? '#1E4A1E' : '#C8E6C9' }]} />
                        <View style={styles.livePreviewItem}>
                            <Text style={[styles.livePreviewNum, { color: themeColors.accent }]}>{totalAyah.toLocaleString()}</Text>
                            <Text style={[styles.livePreviewLabel, { color: isDark ? '#5A8A5A' : '#4F7942' }]}>total</Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.previewBtn, { backgroundColor: themeColors.accent }, (!isValidDays || creating) && styles.btnDisabled]}
                    onPress={handlePreview}
                    disabled={!isValidDays || creating}
                >
                    {creating ? (
                        <ActivityIndicator color={themeColors.background} />
                    ) : (
                        <Text style={[styles.previewBtnText, { color: themeColors.nextBtnText }]}>Preview My Plan →</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={showPreview} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.text }]}>Your {parsedDays}-Day Plan</Text>
                        <Text style={[styles.modalSubtitle, { color: themeColors.subtext }]}>
                            ~{ayahPerDay} ayahs/day · {totalAyah.toLocaleString()} total ayahs
                        </Text>
                        <FlatList
                            data={previewPlan}
                            keyExtractor={item => String(item.day)}
                            style={styles.previewList}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={[styles.previewRow, { borderBottomColor: themeColors.background }]}>
                                    <View style={[styles.previewDayBadge, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                                        <Text style={[styles.previewDayNum, { color: themeColors.subtext }]}>{item.day}</Text>
                                    </View>
                                    <View style={styles.previewInfo}>
                                        <Text style={[styles.previewInfoText, { color: themeColors.text }]}>
                                            Surah {item.startSurah}:{item.startAyah} → {item.endSurah}:{item.endAyah}
                                        </Text>
                                        <Text style={[styles.previewAyahCount, { color: themeColors.subtext }]}>{item.ayahCount} ayahs</Text>
                                    </View>
                                </View>
                            )}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]} onPress={() => setShowPreview(false)}>
                                <Text style={[styles.modalCancelText, { color: themeColors.subtext }]}>← Change</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: themeColors.accent }]} onPress={handleConfirm} disabled={creating}>
                                <Text style={[styles.modalConfirmText, { color: themeColors.nextBtnText }]}>Start Journey ✓</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#8BA7C7', marginTop: 16, fontSize: 14 },
    container: { backgroundColor: '#0D1B2A', padding: 24, paddingTop: 60, paddingBottom: 48 },
    header: { alignItems: 'center', marginBottom: 32 },
    arabic: { fontSize: 22, color: '#C9A96E', marginBottom: 14, textAlign: 'center' },
    title: { fontSize: 32, color: '#EAE0D0', fontWeight: '300', letterSpacing: 2 },
    subtitle: { fontSize: 14, color: '#5A7A9A', marginTop: 6, letterSpacing: 1 },
    statsRow: {
        flexDirection: 'row', backgroundColor: '#132030', borderRadius: 16,
        padding: 20, marginBottom: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1E3348',
    },
    statCard: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 36, color: '#C9A96E', fontWeight: '200' },
    statLabel: { fontSize: 12, color: '#5A7A9A', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' },
    statDivider: { width: 1, height: 50, backgroundColor: '#1E3348' },
    sectionLabel: { fontSize: 11, color: '#5A7A9A', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
    preset: {
        width: '30%', backgroundColor: '#132030', borderRadius: 12, padding: 14,
        alignItems: 'center', borderWidth: 1, borderColor: '#1E3348',
    },
    presetActiveDark: { backgroundColor: '#1A2A14', borderColor: '#C9A96E' },
    presetActiveLight: { backgroundColor: '#F0F9F4', borderColor: '#C9A96E' },
    presetNum: { fontSize: 22, fontWeight: '300' },
    presetNumActive: { color: '#C9A96E' },
    presetDayLabel: { fontSize: 10, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 1 },
    presetDayLabelActive: { color: '#8BA78A' },
    presetAyah: { fontSize: 11, color: '#3D5A73', marginTop: 4 },
    presetAyahActive: { color: '#C9A96E' },
    input: {
        backgroundColor: '#132030', borderWidth: 1, borderColor: '#1E3348',
        borderRadius: 12, padding: 16, fontSize: 20, color: '#EAE0D0', marginBottom: 16, letterSpacing: 1,
    },
    inputActive: { borderColor: '#C9A96E' },
    livePreview: {
        flexDirection: 'row', backgroundColor: '#0A1E14', borderRadius: 14, borderWidth: 1,
        borderColor: '#2A5A2A', padding: 16, marginBottom: 24, alignItems: 'center',
    },
    livePreviewItem: { flex: 1, alignItems: 'center' },
    livePreviewNum: { fontSize: 20, color: '#C9A96E', fontWeight: '300' },
    livePreviewLabel: { fontSize: 10, color: '#5A8A5A', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
    livePreviewDivider: { width: 1, height: 36, backgroundColor: '#1E4A1E' },
    previewBtn: { backgroundColor: '#C9A96E', borderRadius: 14, padding: 18, alignItems: 'center' },
    btnDisabled: { opacity: 0.35 },
    previewBtnText: { color: '#0D1B2A', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#0F1F2E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40, maxHeight: '85%', borderTopWidth: 1, borderColor: '#1E3348',
    },
    modalTitle: { fontSize: 22, color: '#EAE0D0', fontWeight: '300', marginBottom: 4 },
    modalSubtitle: { fontSize: 13, color: '#5A7A9A', marginBottom: 20 },
    previewList: { maxHeight: 380, marginBottom: 20 },
    previewRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#132030',
    },
    previewDayBadge: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#132030',
        alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#1E3348',
    },
    previewDayNum: { fontSize: 13, color: '#8BA7C7', fontWeight: '500' },
    previewInfo: { flex: 1 },
    previewInfoText: { fontSize: 13, color: '#EAE0D0' },
    previewAyahCount: { fontSize: 11, color: '#5A7A9A', marginTop: 2 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: {
        flex: 1, backgroundColor: '#132030', borderRadius: 12, padding: 16,
        alignItems: 'center', borderWidth: 1, borderColor: '#1E3348',
    },
    modalCancelText: { color: '#8BA7C7', fontSize: 15 },
    modalConfirmBtn: { flex: 2, backgroundColor: '#C9A96E', borderRadius: 12, padding: 16, alignItems: 'center' },
    modalConfirmText: { color: '#0D1B2A', fontSize: 15, fontWeight: '700' },
});
