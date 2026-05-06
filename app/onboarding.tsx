import { colors } from '../constants/colors';
import { useThemePalette } from '../hooks/useThemePalette';
import { t } from '../services/i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDED_KEY } from './index';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function splitTitleForAccent(fullTitle: string): { lead: string; accent: string } {
  const trimmed = fullTitle.trim();
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) {
    return { lead: trimmed, accent: '' };
  }
  return {
    lead: `${trimmed.slice(0, idx)} `,
    accent: trimmed.slice(idx + 1),
  };
}

export default function Onboarding() {
  const router = useRouter();
  const palette = useThemePalette();
  const p = palette;
  const float = useRef(new Animated.Value(0)).current;
  const title = t('onboarding.title') as string;
  const { lead, accent } = splitTitleForAccent(title);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [float]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: p.surface }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.Text
          style={[styles.heroEmoji, { transform: [{ translateY }] }]}
          accessibilityRole="text"
        >
          🌿
        </Animated.Text>

        <Text style={[styles.title, { color: p.text }]}>
          {lead}
          {accent ? <Text style={styles.titleAccent}>{accent}</Text> : null}
        </Text>

        <Text style={[styles.subtitle, { color: p.muted }]}>{t('onboarding.subtitle')}</Text>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => {
            void AsyncStorage.setItem(ONBOARDED_KEY, 'true').catch(() => {});
            router.replace('/(tabs)');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.button')}
        >
          <Text style={styles.ctaText}>{t('onboarding.button')}</Text>
        </Pressable>

        <Text style={[styles.languageHint, { color: p.muted }]}>
          🌍 {t('onboarding.languageHint')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 12,
  },
  heroEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 84,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  titleAccent: {
    fontStyle: 'italic',
    color: colors.sage,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 6,
  },
  cta: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    backgroundColor: colors.sageDark,
    opacity: 0.95,
  },
  ctaText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  languageHint: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 12,
    opacity: 0.85,
  },
});
