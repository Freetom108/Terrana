import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../constants/colors';
import { t } from '../../services/i18n/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLACEHOLDER_PRODUCT_COUNT = 0;
const PLACEHOLDER_BLEND_COUNT = 0;

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const statsSubtitle = t('home.statsSubtitle', {
    productCount: PLACEHOLDER_PRODUCT_COUNT,
    blendCount: PLACEHOLDER_BLEND_COUNT,
  });

  const showProductEmpty = PLACEHOLDER_PRODUCT_COUNT === 0;
  const showBlendEmpty = PLACEHOLDER_BLEND_COUNT === 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.sageDark, colors.sage]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.greeting}>{t('home.greetingMorning')}</Text>
        <Text style={styles.statsLine}>{statsSubtitle}</Text>

        <View style={styles.searchShell} pointerEvents="none">
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.lastUsed')}</Text>
          {showProductEmpty ? (
            <EmptyState
              title={t('home.emptyProductsTitle')}
              message={t('home.emptyProductsMessage')}
              emoji="🕐"
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.allProducts')}</Text>
          {showProductEmpty ? (
            <EmptyState
              title={t('home.emptyProductsTitle')}
              message={t('home.emptyProductsMessage')}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.myBlends')}</Text>
          {showBlendEmpty ? (
            <EmptyState
              title={t('home.emptyBlendsTitle')}
              message={t('home.emptyBlendsMessage')}
              emoji="🧪"
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
  },
  statsLine: {
    fontSize: 15,
    color: colors.sageLight,
    marginBottom: 18,
    fontWeight: '500',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  searchIcon: {
    fontSize: 18,
    opacity: 0.55,
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: colors.mid,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 12,
  },
});
