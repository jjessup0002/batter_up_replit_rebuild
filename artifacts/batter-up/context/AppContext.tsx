import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '@/models/types';
import { getSettings, saveSettings } from '@/services/storage';

interface AppContextValue {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  updateSettings: async () => {},
  reloadSettings: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const reloadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    getSettings()
      .then((s) => setSettings(s))
      .finally(() => setIsLoading(false));
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  return (
    <AppContext.Provider value={{ settings, isLoading, updateSettings, reloadSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
