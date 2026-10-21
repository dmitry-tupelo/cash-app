import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { useClaims } from '@/claims/claims-context';
import { AssetRow } from '@/components/asset-row';
import { BalanceSummary } from '@/components/balance-summary';
import { Button } from '@/components/button';
import { RecentClaims } from '@/components/claim/recent-claims';
import { SubmissionBanner } from '@/components/claim/submission-banner';
import { ErrorView, InlineError, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useDisplayBalances } from '@/hooks/use-claims-data';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/time';
import { sortByAvailableUsd } from '@/lib/totals';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { submission, retry, dismiss } = useClaims();
  const { data, dataUpdatedAt, error, isError, isFetching, failureCount, refetch, claims } =
    useDisplayBalances();
  const [pulling, setPulling] = useState(false);

  // If a fetch is already running (auto refresh or a quick double tap), join it instead of
  // cancelling it and starting another request.
  const refresh = () => refetch({ cancelRefetch: false });

  if (!data) {
    if (isError) {
      return <ErrorView error={error} onRetry={refresh} retrying={isFetching} />;
    }
    return (
      <LoadingView
        label="Loading balances…"
        hint={failureCount > 0 ? 'The server is slow to respond. Retrying…' : undefined}
      />
    );
  }

  // Pull-to-refresh works on native only; web uses the Refresh button.
  async function onPull() {
    setPulling(true);
    await refresh();
    setPulling(false);
  }

  const items = sortByAvailableUsd(data.items);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} />}>
      {submission && (
        <SubmissionBanner
          submission={submission}
          onCheckAgain={() => retry()}
          onDismiss={dismiss}
          dismissLabel="Dismiss"
        />
      )}

      {isError && (
        <InlineError
          error={error}
          note={`Showing balances from ${formatTime(data.asOf)}.`}
          onRetry={refresh}
          retrying={isFetching}
        />
      )}

      <BalanceSummary
        balances={data}
        fetchedAt={dataUpdatedAt}
        isFetching={isFetching}
        onRefresh={refresh}
      />

      {items.length > 0 && <Button title="Claim payback" onPress={() => router.push('/claim')} />}

      <RecentClaims claims={claims} />

      <ThemedText type="smallBold" style={styles.heading}>
        Assets
      </ThemedText>
      {items.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No payback yet. It will show up here once you trade on a connected exchange.
        </ThemedText>
      ) : (
        items.map((item) => (
          <AssetRow
            key={item.asset}
            item={item}
            onPress={() => router.push({ pathname: '/claim', params: { asset: item.asset } })}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heading: {
    marginTop: Spacing.two,
  },
});
