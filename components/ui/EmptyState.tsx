import { useThemePalette } from '../../hooks/useThemePalette';
import { StyleSheet, Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  message?: string;
  emoji?: string;
};

export function EmptyState({ title, message, emoji = '📭' }: EmptyStateProps) {
  const p = useThemePalette();
  return (
    <View
      style={[styles.wrap, { backgroundColor: p.card, borderColor: p.border }]}
      accessibilityRole="text"
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: p.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: p.muted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
