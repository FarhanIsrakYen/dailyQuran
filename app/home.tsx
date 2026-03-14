import { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, Alert, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage, QuranPlan, Progress } from '../utils/storage';
import { ThemeType, COLORS } from '../utils/colors';
import SearchAyah from './search';
import Read from './read';
type DayStatus = 'completed' | 'current' | 'missed' | 'locked';

function getDayStatus(day: number, progress: Progress, currentActiveDay: number): DayStatus {
    if (progress.completedDays.includes(day)) return 'completed';
    if (progress.missedDays.includes(day) && day !== currentActiveDay) return 'missed';
    if (day === currentActiveDay) return 'current';
    return 'locked';
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
    onReset: () => void;
    theme: ThemeType;
    onToggleTheme: () => void;
}

export default function Home({ onReset, theme, onToggleTheme }: Props) {
    const [plan, setPlan] = useState<QuranPlan | null>(null);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [currentActiveDay, setCurrentActiveDay] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [readingDay, setReadingDay] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const load = async () => {
        const p = await storage.getPlan();
        const pr = await storage.getProgress();
        if (!p || !pr) { onReset(); return; }
        setPlan(p);
        setProgress(pr);
        const allMissed = pr.missedDays.filter(d => !pr.completedDays.includes(d));
        if (allMissed.length > 0) {
            setCurrentActiveDay(Math.min(...allMissed));
        } else {
            const nextDay = (pr.completedDays.length > 0 ? Math.max(...pr.completedDays) : 0) + 1;
            setCurrentActiveDay(Math.min(nextDay, p.totalDays));
        }
    };

    useEffect(() => { load(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const doReset = async () => {
        try {
            await AsyncStorage.removeItem('quran_plan');
            await AsyncStorage.removeItem('quran_progress');
            await AsyncStorage.removeItem('quran_started');
            onReset();
        } catch {
            Alert.alert('Error', 'Could not clear data. Try again.');
        }
    };

    const handleReset = () => {
        Alert.alert(
            '🗑 Reset Everything',
            'This will permanently delete your plan and all progress. You will start fresh.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Reset',
                    style: 'destructive',
                    onPress: () => { doReset(); },
                },
            ]
        );
    };

    const handleDayPress = (day: number, status: DayStatus) => {
        if (status === 'locked') {
            Alert.alert('🔒 Locked', 'Complete the previous day first.');
            return;
        }
        if (status === 'missed') {
            Alert.alert('⚠️ Missed Day', `Recover Day ${day} before continuing.`, [
                { text: 'Later', style: 'cancel' },
                { text: 'Recover Now', onPress: () => setReadingDay(day) },
            ]);
            return;
        }
        setReadingDay(day);
    };

    if (!plan || !progress) return null;

    if (readingDay !== null) {
        return (
            <Read
                day={readingDay}
                onBack={() => { setReadingDay(null); load(); }}
                theme={theme}
            />
        );
    }

    if (isSearching) {
        return (
            <SearchAyah
                onBack={() => setIsSearching(false)}
                theme={theme}
            />
        );
    }

    const themeColors = COLORS[theme];
    const isDark = theme === 'dark';

    const completedCount = progress.completedDays.length;
    const missedCount = progress.missedDays.filter(d => !progress.completedDays.includes(d)).length;
    const percent = Math.round((completedCount / plan.totalDays) * 100);
    const currentDayPlan = plan.days[currentActiveDay - 1];

    // FIX: Use getDayStatus() for the current day card to correctly reflect 'missed' vs 'current'
    const currentDayStatus = getDayStatus(currentActiveDay, progress, currentActiveDay);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: themeColors.text }]}>My Journey</Text>
                    <Text style={[styles.subtitle, { color: themeColors.subtext }]}>Started {formatDate(plan.createdAt)}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={onToggleTheme} style={styles.themeBtn}>
                        <Text style={styles.themeText}>{isDark ? '☀️' : '🌙'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsSearching(true)} style={styles.searchBtn}>
                        <Text style={[styles.searchText, { color: themeColors.accent }]}>🔍 Search</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                        <Text style={styles.resetText}>🗑 Reset</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />}
            >
                {/* Plan summary */}
                <View style={[styles.planCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <View style={styles.planRow}>
                        <View style={styles.planItem}>
                            <Text style={[styles.planNum, { color: themeColors.accent }]}>{plan.totalDays}</Text>
                            <Text style={[styles.planLabel, { color: themeColors.subtext }]}>Total Days</Text>
                        </View>
                        <View style={[styles.planDivider, { backgroundColor: themeColors.border }]} />
                        <View style={styles.planItem}>
                            <Text style={[styles.planNum, { color: themeColors.accent }]}>{plan.totalAyah.toLocaleString()}</Text>
                            <Text style={[styles.planLabel, { color: themeColors.subtext }]}>Total Ayahs</Text>
                        </View>
                        <View style={[styles.planDivider, { backgroundColor: themeColors.border }]} />
                        <View style={styles.planItem}>
                            <Text style={[styles.planNum, { color: themeColors.accent }]}>~{plan.days[0]?.ayahCount ?? 0}</Text>
                            <Text style={[styles.planLabel, { color: themeColors.subtext }]}>Ayahs/Day</Text>
                        </View>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: themeColors.background }]}>
                        <View style={[styles.progressFill, { backgroundColor: themeColors.accent, width: `${percent}%` as any }]} />
                    </View>
                    <View style={styles.progressStats}>
                        <Text style={[styles.progressText, { color: themeColors.subtext }]}>{completedCount}/{plan.totalDays} days done</Text>
                        <Text style={[styles.progressPct, { color: themeColors.accent }]}>{percent}%</Text>
                    </View>
                </View>

                {/* Current day */}
                {currentDayPlan && completedCount < plan.totalDays && (
                    <TouchableOpacity
                        style={[
                            styles.currentCard, 
                            { 
                                backgroundColor: isDark ? '#0A1E14' : '#F0F9F4', 
                                borderColor: themeColors.accent 
                            }
                        ]}
                        onPress={() => handleDayPress(currentActiveDay, currentDayStatus)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.currentLeft}>
                            <Text style={[styles.currentLabel, { color: themeColors.accent }]}>
                                {currentDayStatus === 'missed' ? '⚠️ Recover' : '▶ Today'}
                            </Text>
                            <Text style={[styles.currentDay, { color: themeColors.text }]}>Day {currentActiveDay}</Text>
                            <Text style={[styles.currentMeta, { color: isDark ? '#5A8A5A' : '#4F7942' }]}>
                                {currentDayPlan.ayahCount} ayahs · Surah {currentDayPlan.startSurah}:{currentDayPlan.startAyah} → {currentDayPlan.endSurah}:{currentDayPlan.endAyah}
                            </Text>
                        </View>
                        <Text style={[styles.currentArrow, { color: themeColors.accent }]}>→</Text>
                    </TouchableOpacity>
                )}

                {completedCount === plan.totalDays && (
                    <View style={styles.completedBanner}>
                        <Text style={styles.completedEmoji}>🎉</Text>
                        <Text style={styles.completedText}>You've completed the entire Quran!</Text>
                    </View>
                )}

                {missedCount > 0 && (
                    <View style={[
                        styles.warningBanner, 
                        { backgroundColor: isDark ? '#2A1A0D' : '#FEF8F2', borderLeftColor: '#E8A035' }
                    ]}>
                        <Text style={styles.warningText}>
                            ⚠️ {missedCount} missed day{missedCount > 1 ? 's' : ''} — complete them before moving forward
                        </Text>
                    </View>
                )}

                <Text style={[styles.gridLabel, { color: themeColors.subtext }]}>All Days</Text>
                <View style={styles.grid}>
                    {plan.days.map(dayPlan => {
                        const status = getDayStatus(dayPlan.day, progress, currentActiveDay);
                        const themedCardStyle = getThemedCardStyle(status, isDark, themeColors);
                        const themedNumStyle = getThemedNumStyle(status, themeColors);
                        const themedLabelStyle = getThemedLabelStyle(status, themeColors);
                        const themedAyahStyle = getThemedAyahStyle(status, isDark, themeColors);

                        return (
                            <TouchableOpacity
                                key={dayPlan.day}
                                style={[styles.dayCard, themedCardStyle]}
                                onPress={() => handleDayPress(dayPlan.day, status)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.dayNum, themedNumStyle]}>
                                    {status === 'completed' ? '✓' : dayPlan.day}
                                </Text>
                                <Text style={[styles.dayLabel, themedLabelStyle]}>Day {dayPlan.day}</Text>
                                <Text style={[styles.dayAyahs, themedAyahStyle]}>{dayPlan.ayahCount}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const getThemedCardStyle = (status: DayStatus, isDark: boolean, colors: any) => {
    switch (status) {
        case 'completed': return { backgroundColor: isDark ? '#0E2010' : '#E8F5E9', borderColor: isDark ? '#2A5A2A' : '#C8E6C9' };
        case 'current': return { backgroundColor: isDark ? '#1A2D1A' : '#F0F9F4', borderColor: colors.accent };
        case 'missed': return { backgroundColor: isDark ? '#2A1A0D' : '#FEF8F2', borderColor: '#E8A035' };
        default: return { backgroundColor: isDark ? '#0F1A24' : '#F5F7F9', borderColor: colors.border };
    }
};

const getThemedNumStyle = (status: DayStatus, colors: any) => {
    switch (status) {
        case 'completed': return { color: '#4CAF50', fontSize: 16 };
        case 'current': return { color: colors.accent };
        case 'missed': return { color: '#E8A035' };
        default: return { color: colors.subtext };
    }
};

const getThemedLabelStyle = (status: DayStatus, colors: any) => {
    switch (status) {
        case 'completed': return { color: '#4CAF50' };
        case 'current': return { color: colors.accent };
        case 'missed': return { color: '#E8A035' };
        default: return { color: colors.subtext };
    }
};

const getThemedAyahStyle = (status: DayStatus, isDark: boolean, colors: any) => {
    switch (status) {
        case 'completed': return { color: isDark ? '#2A5A2A' : '#81C784' };
        case 'current': return { color: isDark ? '#8A7A5A' : '#B09A6A' };
        case 'missed': return { color: isDark ? '#6A4A20' : '#D0A060' };
        default: return { color: isDark ? '#1E3348' : '#D0DAE2' };
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    },
    title: { fontSize: 28, color: '#EAE0D0', fontWeight: '300' },
    subtitle: { fontSize: 12, color: '#5A7A9A', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    themeBtn: { padding: 4, marginRight: 4 },
    themeText: { fontSize: 18 },
    searchBtn: { paddingVertical: 8, paddingHorizontal: 4 },
    searchText: { color: '#C9A96E', fontSize: 13, fontWeight: '600' },
    resetBtn: { paddingVertical: 8, paddingHorizontal: 4 },
    resetText: { color: '#E05555', fontSize: 13, fontWeight: '600' },
    scroll: { flex: 1 },
    planCard: {
        marginHorizontal: 20, backgroundColor: '#132030', borderRadius: 18,
        padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1E3348',
    },
    planRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    planItem: { flex: 1, alignItems: 'center' },
    planNum: { fontSize: 24, color: '#C9A96E', fontWeight: '200' },
    planLabel: { fontSize: 10, color: '#5A7A9A', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 },
    planDivider: { width: 1, height: 40, backgroundColor: '#1E3348' },
    progressBar: { height: 6, backgroundColor: '#0D1B2A', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#C9A96E', borderRadius: 3 },
    progressStats: { flexDirection: 'row', justifyContent: 'space-between' },
    progressText: { fontSize: 12, color: '#5A7A9A' },
    progressPct: { fontSize: 12, color: '#C9A96E', fontWeight: '600' },
    currentCard: {
        marginHorizontal: 20, backgroundColor: '#0A1E14', borderRadius: 16,
        padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#C9A96E',
        flexDirection: 'row', alignItems: 'center',
    },
    currentLeft: { flex: 1 },
    currentLabel: { fontSize: 11, color: '#C9A96E', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    currentDay: { fontSize: 22, color: '#EAE0D0', fontWeight: '300', marginBottom: 2 },
    currentMeta: { fontSize: 12, color: '#5A8A5A' },
    currentArrow: { fontSize: 20, color: '#C9A96E' },
    completedBanner: {
        marginHorizontal: 20, backgroundColor: '#0A1E14', borderRadius: 16,
        padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#2A5A2A', alignItems: 'center',
    },
    completedEmoji: { fontSize: 36, marginBottom: 8 },
    completedText: { fontSize: 16, color: '#4CAF50', textAlign: 'center' },
    warningBanner: {
        marginHorizontal: 20, backgroundColor: '#2A1A0D', borderRadius: 10,
        padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#E8A035',
    },
    warningText: { color: '#E8A035', fontSize: 13 },
    gridLabel: {
        fontSize: 11, color: '#5A7A9A', letterSpacing: 2, textTransform: 'uppercase',
        marginHorizontal: 24, marginBottom: 12, marginTop: 4,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 48, gap: 10 },
    dayCard: {
        width: '30%', aspectRatio: 0.9, borderRadius: 14, padding: 10,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    dayNum: { fontSize: 20, fontWeight: '200', marginBottom: 2 },
    dayLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
    dayAyahs: { fontSize: 10, marginTop: 3 },
});
