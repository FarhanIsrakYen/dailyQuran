import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { storage } from '../utils/storage';
import Setup from './setup';
import Home from './home';

// Single-file routing: no Stack needed, we control rendering ourselves
// This avoids all expo-router navigation bugs with replace/reset
export default function RootLayout() {
    const [screen, setScreen] = useState<'loading' | 'setup' | 'home'>('loading');

    // FIX: Removed unnecessary useCallback wrap — function is only called once in useEffect
    const checkStorage = async () => {
        try {
            const started = await storage.getStarted();
            const plan = await storage.getPlan();
            const progress = await storage.getProgress();
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
        checkStorage();
    }, []);

    const goToHome = () => setScreen('home');
    const goToSetup = () => setScreen('setup');

    if (screen === 'loading') {
        return (
            <View style={styles.loading}>
                <StatusBar style="light" />
                <ActivityIndicator size="large" color="#C9A96E" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            {screen === 'setup' ? (
                <Setup onComplete={goToHome} />
            ) : (
                <Home onReset={goToSetup} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0D1B2A' },
    loading: { flex: 1, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' },
});
