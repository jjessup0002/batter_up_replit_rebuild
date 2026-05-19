import { useContext } from 'react';
import { useColorScheme } from 'react-native';

import colors from '@/constants/colors';
import { AppContext } from '@/context/AppContext';

export function useColors() {
  const scheme = useColorScheme();
  const { settings } = useContext(AppContext);

  const displayMode = settings?.displayMode ?? 'system';

  const isDark =
    displayMode === 'dark' ||
    (displayMode === 'system' && scheme === 'dark');

  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
