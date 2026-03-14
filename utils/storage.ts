import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PLAN: 'quran_plan',
  PROGRESS: 'quran_progress',
  STARTED: 'quran_started',
  THEME: 'quran_theme',
};

export interface DayPlan {
  day: number;
  ayahCount: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

export interface QuranPlan {
  totalDays: number;
  totalAyah: number;
  days: DayPlan[];
  createdAt: string;
}

export interface Progress {
  completedDays: number[];
  missedDays: number[];
  currentSurah: number;
  currentAyah: number;
  lastActiveDay: number | null;
  dayStartTimes: Record<number, string>;
  ayahsDoneToday?: number; // Added tracking
}

export const storage = {
  async savePlan(plan: QuranPlan): Promise<void> {
    await AsyncStorage.setItem(KEYS.PLAN, JSON.stringify(plan));
  },

  async getPlan(): Promise<QuranPlan | null> {
    const data = await AsyncStorage.getItem(KEYS.PLAN);
    return data ? JSON.parse(data) : null;
  },

  async saveProgress(progress: Progress): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  },

  async getProgress(): Promise<Progress | null> {
    const data = await AsyncStorage.getItem(KEYS.PROGRESS);
    return data ? JSON.parse(data) : null;
  },

  async setStarted(started: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.STARTED, JSON.stringify(started));
  },

  async getStarted(): Promise<boolean> {
    const data = await AsyncStorage.getItem(KEYS.STARTED);
    return data ? JSON.parse(data) : false;
  },

  async saveTheme(theme: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.THEME, theme);
  },

  async getTheme(): Promise<string> {
    const data = await AsyncStorage.getItem(KEYS.THEME);
    return data || 'dark';
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.PLAN);
    await AsyncStorage.removeItem(KEYS.PROGRESS);
    await AsyncStorage.removeItem(KEYS.STARTED);
  },
};
