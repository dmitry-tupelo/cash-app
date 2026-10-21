import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/errors';

export function LoadingView({ label, hint }: { label: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={theme.tint} size="large" />
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      {hint && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

type ErrorProps = {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
};

/** Full-screen error for when there is nothing to show yet. */
export function ErrorView({ error, onRetry, retrying }: ErrorProps) {
  const { title, message, tokenProblem } = describeError(error);
  return (
    <View style={styles.centered}>
      <ThemedText type="smallBold" style={styles.text}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {message}
      </ThemedText>
      <ErrorAction tokenProblem={tokenProblem} onRetry={onRetry} retrying={retrying} />
    </View>
  );
}

/** Banner for a failed refresh while older data stays on screen; `note` says how old it is. */
export function InlineError({ error, note, onRetry, retrying }: ErrorProps & { note: string }) {
  const theme = useTheme();
  const { title, message, tokenProblem } = describeError(error);
  return (
    <View style={[styles.banner, { borderColor: theme.danger }]}>
      <ThemedText type="smallBold" themeColor="danger">
        Couldn’t refresh: {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message} {note}
      </ThemedText>
      <ErrorAction tokenProblem={tokenProblem} onRetry={onRetry} retrying={retrying} />
    </View>
  );
}

function ErrorAction({ tokenProblem, onRetry, retrying }: Omit<ErrorProps, 'error'> & { tokenProblem: boolean }) {
  const router = useRouter();
  return tokenProblem ? (
    <Button title="Change token" onPress={() => router.push('/settings')} />
  ) : (
    <Button title="Try again" onPress={onRetry} loading={retrying} />
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
