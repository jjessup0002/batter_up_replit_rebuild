import React, { useContext } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AppContext } from '@/context/AppContext';

interface ThemedTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'button';
  color?: string;
  align?: TextStyle['textAlign'];
}

const TEXT_SCALE: Record<string, number> = {
  standard: 1,
  large: 1.18,
  xlarge: 1.36,
};

export function ThemedText({ variant = 'body', color, align, style, ...props }: ThemedTextProps) {
  const colors = useColors();
  const { settings } = useContext(AppContext);
  const scale = TEXT_SCALE[settings?.textSize ?? 'standard'] ?? 1;

  const variantStyles: Record<string, TextStyle> = {
    h1: { fontSize: Math.round(26 * scale), fontWeight: '700' as const, color: colors.foreground, fontFamily: 'Inter_700Bold' },
    h2: { fontSize: Math.round(20 * scale), fontWeight: '600' as const, color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
    h3: { fontSize: Math.round(17 * scale), fontWeight: '600' as const, color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
    body: { fontSize: Math.round(15 * scale), fontWeight: '400' as const, color: colors.foreground, fontFamily: 'Inter_400Regular' },
    caption: { fontSize: Math.round(12 * scale), fontWeight: '500' as const, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
    label: { fontSize: Math.round(13 * scale), fontWeight: '500' as const, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
    button: { fontSize: Math.round(15 * scale), fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  };

  return (
    <Text
      style={[variantStyles[variant], color ? { color } : undefined, align ? { textAlign: align } : undefined, style]}
      {...props}
    />
  );
}
