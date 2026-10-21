import { StyleSheet, View } from 'react-native';

import { useToken } from '@/auth/token-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TokenForm } from '@/components/token-form';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  const { saveToken } = useToken();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="subtitle">CashMine</ThemedText>
        <ThemedText themeColor="textSecondary">
          See your payback balances and claim them. Enter your API token to continue.
        </ThemedText>
        <TokenForm submitLabel="Continue" onSubmit={saveToken} />
        <ThemedText type="small" themeColor="textSecondary">
          The token is stored only in this browser. You can change it later.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
