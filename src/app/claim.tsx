import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ClaimForm } from '@/components/claim/claim-form';
import { ErrorView, LoadingView } from '@/components/state-views';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useDisplayBalances } from '@/hooks/use-claims-data';
import { useTheme } from '@/hooks/use-theme';
import { sortByAvailableUsd } from '@/lib/totals';

export default function ClaimScreen() {
  const theme = useTheme();
  const { asset } = useLocalSearchParams<{ asset?: string }>();
  const { data, error, isError, isFetching, refetch } = useDisplayBalances();

  if (!data) {
    return isError ? (
      <ErrorView error={error} onRetry={() => refetch()} retrying={isFetching} />
    ) : (
      <LoadingView label="Loading balances…" />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ClaimForm items={sortByAvailableUsd(data.items)} initialAsset={asset} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
  },
});
