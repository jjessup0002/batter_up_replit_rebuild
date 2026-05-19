import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, StyleSheet, TextStyle, TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  onPress,
  disabled,
  ...props
}: ButtonProps) {
  const colors = useColors();

  const variantStyles: Record<string, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { backgroundColor: colors.primary },
      text: { color: colors.primaryForeground },
    },
    secondary: {
      container: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.primary },
      text: { color: colors.primary },
    },
    accent: {
      container: { backgroundColor: colors.accent },
      text: { color: colors.accentForeground },
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
      text: { color: colors.foreground },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: colors.primary },
    },
    destructive: {
      container: { backgroundColor: colors.destructive },
      text: { color: colors.destructiveForeground },
    },
  };

  const sizeStyles: Record<string, { container: ViewStyle; text: TextStyle }> = {
    sm: { container: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }, text: { fontSize: 13 } },
    md: { container: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 }, text: { fontSize: 15 } },
    lg: { container: { paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12 }, text: { fontSize: 16 } },
    xl: { container: { paddingHorizontal: 24, paddingVertical: 18, borderRadius: 14 }, text: { fontSize: 17 } },
  };

  const handlePress = (e: Parameters<NonNullable<TouchableOpacityProps['onPress']>>[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant].container,
        sizeStyles[size].container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <ThemedText
            variant="button"
            style={[variantStyles[variant].text, sizeStyles[size].text]}
          >
            {title}
          </ThemedText>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
