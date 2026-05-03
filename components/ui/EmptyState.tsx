import { colors } from '../../constants/colors';
import { StyleSheet, Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  message?: string;
  emoji?: string;
};

export function EmptyState({ title, message, emoji = '📭' }: EmptyStateProps) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sageLight,
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    color: colors.mid,
    textAlign: 'center',
    lineHeight: 20,
  },
});
