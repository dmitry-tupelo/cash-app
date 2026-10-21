import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import type { Claim, ClaimOptions } from '@/api/claims';
import { useToken } from '@/auth/token-context';
import { Button } from '@/components/button';
import { ClaimStatusText } from '@/components/claim/claim-status';
import { DetailRow } from '@/components/detail-row';
import { ErrorView, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useClaim } from '@/hooks/use-claims-data';
import { useTheme } from '@/hooks/use-theme';
import { formatDecimalString } from '@/lib/amount';

export default function ClaimStatusScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: claim, error, isError, isFetching, refetch } = useClaim(id);

  if (!claim) {
    return isError ? (
      <ErrorView error={error} onRetry={() => refetch()} retrying={isFetching} />
    ) : (
      <LoadingView label="Loading claim…" />
    );
  }

  const destination =
    queryClient
      .getQueryData<ClaimOptions>(['claim-options', token, claim.asset])
      ?.destinations.find((d) => d.id === claim.destinationId)?.label ?? claim.destinationId;
  const amount = (value: string) => `${formatDecimalString(value)} ${claim.asset}`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <ThemedView type="backgroundElement" style={[styles.card, styles.statusCard]}>
        {claim.status === 'pending' && <ActivityIndicator color={theme.tint} />}
        <ClaimStatusText status={claim.status} large />
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {statusMessage(claim, destination, amount)}
        </ThemedText>
      </ThemedView>

      {/* Polling keeps going after an error; this only says the status shown may be old. */}
      {isError && (
        <ThemedText type="small" themeColor="warning">
          Couldn’t update the status. Retrying…
        </ThemedText>
      )}

      <ThemedView type="backgroundElement" style={styles.card}>
        <DetailRow label="Amount" value={amount(claim.amount)} />
        <DetailRow label="Fee" value={`− ${amount(claim.fee)}`} />
        <DetailRow label="You receive" value={amount(claim.receiveAmount)} strong />
        <DetailRow label="To" value={destination} />
        <DetailRow label="Created" value={new Date(claim.createdAt).toLocaleString()} />
        <DetailRow label="Claim ID" value={claim.id} />
      </ThemedView>

      <Button
        title="Back to balances"
        variant="secondary"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </ScrollView>
  );
}

function statusMessage(claim: Claim, destination: string, amount: (value: string) => string) {
  switch (claim.status) {
    case 'pending':
      return 'This usually takes about 20 seconds. You can leave this screen: the claim is also tracked on the home screen.';
    case 'completed':
      return `${amount(claim.receiveAmount)} was sent to ${destination}.`;
    case 'failed':
      return `${claim.failureReason ?? 'The claim could not be completed.'} ${amount(claim.amount)} is back in your available balance.`;
  }
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});
