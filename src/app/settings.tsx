import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useToken } from '@/auth/token-context';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { TokenForm } from '@/components/token-form';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function maskToken(token: string) {
  return token.length > 12 ? `${token.slice(0, 6)}…${token.slice(-4)}` : '••••';
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { token, saveToken, clearToken } = useToken();

  function replaceToken(value: string) {
    saveToken(value);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Current token
        </ThemedText>
        <ThemedText type="code">{token ? maskToken(token) : '—'}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Replace token</ThemedText>
        <TokenForm submitLabel="Save new token" onSubmit={replaceToken} />
      </View>

      {/* Removing the token makes the router send the user back to the welcome screen. */}
      <Button title="Remove token" variant="secondary" onPress={clearToken} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
});
