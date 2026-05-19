import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppSettings, CustomPresets, DEFAULT_SETTINGS, GAME_RULE_PRESETS, GameType, GameRules } from '@/models/types';
import { getCustomPresets, getSettings, saveCustomPresets, saveSettings } from '@/services/storage';

interface AppContextValue {
  settings: AppSettings;
  presets: CustomPresets;
  isLoading: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
  updatePreset: (type: GameType, partial: Partial<GameRules>) => Promise<void>;
  resetPreset: (type: GameType) => Promise<void>;
  reloadPresets: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue>({
  settings: DEFAULT_SETTINGS,
  presets: { ...GAME_RULE_PRESETS },
  isLoading: true,
  updateSettings: async () => {},
  reloadSettings: async () => {},
  updatePreset: async () => {},
  resetPreset: async () => {},
  reloadPresets: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [presets, setPresets] = useState<CustomPresets>({ ...GAME_RULE_PRESETS });
  const [isLoading, setIsLoading] = useState(true);

  const reloadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  const reloadPresets = useCallback(async () => {
    const p = await getCustomPresets();
    setPresets(p);
  }, []);

  useEffect(() => {
    Promise.all([getSettings(), getCustomPresets()])
      .then(([s, p]) => {
        setSettings(s);
        setPresets(p);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const updatePreset = useCallback(async (type: GameType, partial: Partial<GameRules>) => {
    const updated: CustomPresets = {
      ...presets,
      [type]: { ...presets[type], ...partial },
    };
    setPresets(updated);
    await saveCustomPresets(updated);
  }, [presets]);

  const resetPreset = useCallback(async (type: GameType) => {
    const updated: CustomPresets = {
      ...presets,
      [type]: { ...GAME_RULE_PRESETS[type] },
    };
    setPresets(updated);
    await saveCustomPresets(updated);
  }, [presets]);

  return (
    <AppContext.Provider value={{
      settings, presets, isLoading,
      updateSettings, reloadSettings,
      updatePreset, resetPreset, reloadPresets,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
