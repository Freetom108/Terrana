import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function BlendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.box}>
      <Text style={styles.text}>Mischung {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.dark },
});
