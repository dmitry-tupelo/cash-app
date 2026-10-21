import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { TokenProvider, useToken } from '@/auth/token-context';
import { ClaimsProvider } from '@/claims/claims-context';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <QueryClientProvider client={queryClient}>
        <TokenProvider>
          <ClaimsProvider>
            <RootStack />
          </ClaimsProvider>
        </TokenProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// Without a token only the welcome screen is reachable; saving or removing the token
// makes the router switch screens on its own.
function RootStack() {
  const { token } = useToken();
  const hasToken = token !== null;

  return (
    <Stack>
      <Stack.Protected guard={hasToken}>
        <Stack.Screen
          name="index"
          options={{ title: 'CashMine', headerRight: () => <HomeHeaderLinks /> }}
        />
        <Stack.Screen name="claim" options={{ title: 'Claim payback' }} />
        <Stack.Screen name="claims/[id]" options={{ title: 'Claim status' }} />
        <Stack.Screen name="activity" options={{ title: 'Activity' }} />
        <Stack.Screen name="settings" options={{ title: 'API token' }} />
      </Stack.Protected>
      <Stack.Protected guard={!hasToken}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function HomeHeaderLinks() {
  const router = useRouter();
  return (
    <View style={styles.headerLinks}>
      <HeaderLink label="Activity" onPress={() => router.push('/activity')} />
      <HeaderLink label="Token" onPress={() => router.push('/settings')} />
    </View>
  );
}

function HeaderLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerLinks: {
    flexDirection: 'row',
  },
  headerButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
