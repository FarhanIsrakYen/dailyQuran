import React, { createContext, useContext, useState, useCallback } from 'react';

interface AppContextType {
    resetKey: number;
    triggerReset: () => void;
}

const AppContext = createContext<AppContextType>({
    resetKey: 0,
    triggerReset: () => { },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [resetKey, setResetKey] = useState(0);

    const triggerReset = useCallback(() => {
        setResetKey(k => k + 1);
    }, []);

    return (
        <AppContext.Provider value={{ resetKey, triggerReset }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    return useContext(AppContext);
}
