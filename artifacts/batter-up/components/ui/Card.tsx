import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface CardProps extends ViewProps {
  padding?: number;
  shadow?: boolean;
}

export function Card({ padding = 16, shadow = true, style, children, ...props }: CardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderRadius: colors.radius, padding, borderColor: colors.border },
        shadow && styles.shadow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
