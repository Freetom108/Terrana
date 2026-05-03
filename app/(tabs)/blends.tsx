import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function BlendsTab() {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>Mischungen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.dark, fontSize: 18 },
});
