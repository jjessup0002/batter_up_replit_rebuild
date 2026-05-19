import React from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

const FULL_LOGO = require('@/assets/images/batter-up-logo.png');
const SMALL_LOGO = require('@/assets/images/batter-up-logo-small.png');

interface LogoProps {
  size?: 'full' | 'small';
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function BatterUpLogo({ size = 'full', width, height, style }: LogoProps) {
  const isSmall = size === 'small';

  const defaultWidth = isSmall ? 40 : 200;
  const defaultHeight = isSmall ? 40 : 80;

  const w = width ?? defaultWidth;
  const h = height ?? defaultHeight;

  const imgStyle: StyleProp<ImageStyle> = {
    width: w,
    height: h,
    resizeMode: 'contain',
  };

  return (
    <View style={style}>
      <Image source={isSmall ? SMALL_LOGO : FULL_LOGO} style={imgStyle} />
    </View>
  );
}
