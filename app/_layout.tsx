import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { storage } from '../utils/storage';
import Setup from './setup';
import Home from './home';
import { initSecurity } from '../utils/security';
import { ThemeType, COLORS } from '../utils/colors';

// Single-file routing: no Stack needed, we control rendering ourselves
// This avoids all expo-router navigation bugs with replace/reset
export default function RootLayout() {
    const [screen, setScreen] = useState<'loading' | 'setup' | 'home'>('loading');
    const [theme, setTheme] = useState<ThemeType>('dark');

    // FIX: Removed unnecessary useCallback wrap — function is only called once in useEffect
    const checkStorage = async () => {
        try {
            const started = await storage.getStarted();
            const plan = await storage.getPlan();
            const progress = await storage.getProgress();
            const storedTheme = await storage.getTheme() as ThemeType;
            setTheme(storedTheme);
            
            if (started && plan && progress) {
                setScreen('home');
            } else {
                setScreen('setup');
            }
        } catch {
            setScreen('setup');
        }
    };

    useEffect(() => {
        initSecurity();
        checkStorage();
    }, []);

    const goToHome = () => setScreen('home');
    const goToSetup = () => setScreen('setup');
    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        await storage.saveTheme(newTheme);
    };

    const themeColors = COLORS[theme];

    if (screen === 'loading') {
        return (
            <View style={[styles.loading, { backgroundColor: themeColors.background }]}>
                <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
                <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: themeColors.background }]}>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            {screen === 'setup' ? (
                <Setup onComplete={goToHome} theme={theme} />
            ) : (
                <Home onReset={goToSetup} theme={theme} onToggleTheme={toggleTheme} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0D1B2A' },
    loading: { flex: 1, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' },
});
