import { useThemePalette } from '../../hooks/useThemePalette';
import { t } from '../../services/i18n/i18n';
import { StyleSheet, Text, View } from 'react-native';

export default function BlendsTab() {
  const p = useThemePalette();
  return (
    <View style={[styles.box, { backgroundColor: p.surface }]}>
      <Text style={[styles.text, { color: p.text }]}>{t('tabs.blends')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 18 },
});
