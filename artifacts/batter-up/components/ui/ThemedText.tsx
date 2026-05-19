import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface ThemedTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'button';
  color?: string;
  align?: TextStyle['textAlign'];
}

export function ThemedText({ variant = 'body', color, align, style, ...props }: ThemedTextProps) {
  const colors = useColors();

  const variantStyles: Record<string, TextStyle> = {
    h1: { fontSize: 26, fontWeight: '700' as const, color: colors.foreground, fontFamily: 'Inter_700Bold' },
    h2: { fontSize: 20, fontWeight: '600' as const, color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
    h3: { fontSize: 17, fontWeight: '600' as const, color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
    body: { fontSize: 15, fontWeight: '400' as const, color: colors.foreground, fontFamily: 'Inter_400Regular' },
    caption: { fontSize: 12, fontWeight: '500' as const, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
    label: { fontSize: 13, fontWeight: '500' as const, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
    button: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  };

  return (
    <Text
      style={[variantStyles[variant], color ? { color } : undefined, align ? { textAlign: align } : undefined, style]}
      {...props}
    />
  );
}
