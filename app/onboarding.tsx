import { colors } from '../constants/colors';
import { ONBOARDED_KEY } from './index';
import { useThemePalette } from '../hooks/useThemePalette';
import { t } from '../services/i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_W = Dimensions.get('window').width;
const PAGE_COUNT = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const p = useThemePalette();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const isLast = page === PAGE_COUNT - 1;

  const finish = async () => {
    if (from !== 'settings') {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true').catch(() => {});
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const goToPage = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
    setPage(idx);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPage(next);
  };

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      {/* ── Skip button ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.flex1} />
        {!isLast ? (
          <Pressable
            onPress={() => void finish()}
            hitSlop={12}
            accessibilityRole="button"
            style={styles.skipBtn}
          >
            <Text style={[styles.skipText, { color: p.muted }]}>
              {t('onboarding.skip') as string}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── Pages ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        style={styles.pager}
        contentContainerStyle={{ width: SCREEN_W * PAGE_COUNT }}
        bounces={false}
      >
        {/* Page 1 – Welcome */}
        <View style={[styles.page, { width: SCREEN_W }]}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
          <Text style={[styles.pageTitle, { color: p.text }]}>
            {t('onboarding.title') as string}
          </Text>
          <Text style={[styles.pageBody, { color: p.muted }]}>
            {t('onboarding.subtitle') as string}
          </Text>
        </View>

        {/* Page 2 – AI Import */}
        <View style={[styles.page, { width: SCREEN_W }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(122,158,126,0.12)' }]}>
            <Ionicons name="bulb-outline" size={52} color={colors.sage} />
          </View>
          <Text style={[styles.pageTitle, { color: p.text }]}>
            {t('onboarding.page2Title') as string}
          </Text>
          <Text style={[styles.pageBody, { color: p.muted }]}>
            {t('onboarding.page2Body') as string}
          </Text>
        </View>

        {/* Page 3 – Blends */}
        <View style={[styles.page, { width: SCREEN_W }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(122,158,126,0.12)' }]}>
            <Ionicons name="flask-outline" size={52} color={colors.sage} />
          </View>
          <Text style={[styles.pageTitle, { color: p.text }]}>
            {t('onboarding.page3Title') as string}
          </Text>
          <Text style={[styles.pageBody, { color: p.muted }]}>
            {t('onboarding.page3Body') as string}
          </Text>
        </View>

        {/* Page 4 – Ready */}
        <View style={[styles.page, { width: SCREEN_W }]}>
          <Text style={[styles.readyTitle, { color: p.text }]}>
            {t('onboarding.page4Title') as string}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.sageDark },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => void finish()}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>{t('onboarding.button') as string}</Text>
          </Pressable>
          <Text style={[styles.hint, { color: p.muted }]}>
            {t('onboarding.hint') as string}
          </Text>
        </View>
      </ScrollView>

      {/* ── Dots + Next button ── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {Array.from({ length: PAGE_COUNT }).map((_, idx) => (
            <Pressable key={idx} onPress={() => goToPage(idx)} hitSlop={8}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: idx === page ? colors.sage : p.border,
                    width: idx === page ? 22 : 8,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {!isLast ? (
          <Pressable
            onPress={() => goToPage(page + 1)}
            style={[styles.nextBtn, { backgroundColor: colors.sageDark }]}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.next') as string}
          >
            <Ionicons name="arrow-forward" size={22} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  flex1: { flex: 1 },
  skipBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  skipText: { fontSize: 15, fontWeight: '600' },
  pager: { flex: 1 },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.cream,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  pageBody: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '400',
    paddingHorizontal: 8,
  },
  readyTitle: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  cta: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  ctaText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
    opacity: 0.85,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: 12,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
