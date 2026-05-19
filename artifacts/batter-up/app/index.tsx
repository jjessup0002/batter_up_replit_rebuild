import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { getSettings } from '@/services/storage';

export default function Index() {
  const [target, setTarget] = useState<'onboarding' | 'home' | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setTarget(s.onboardingComplete ? 'home' : 'onboarding');
    });
  }, []);

  if (!target) return <View style={{ flex: 1 }} />;
  if (target === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
