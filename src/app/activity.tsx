import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/activity-row';
import { Button } from '@/components/button';
import { ErrorView, InlineError, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useActivity } from '@/hooks/use-activity';
import { useTheme } from '@/hooks/use-theme';

export default function ActivityScreen() {
  const theme = useTheme();
  const {
    data,
    items,
    error,
    isError,
    isFetching,
    isRefetchError,
    isFetchNextPageError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useActivity();
  const [pulling, setPulling] = useState(false);

  if (!data) {
    return isError ? (
      <ErrorView error={error} onRetry={() => refetch()} retrying={isFetching} />
    ) : (
      <LoadingView label="Loading activity…" />
    );
  }

  // Automatic loading stops after a failed page, so it doesn't retry in a loop; the footer
  // offers "Try again" instead.
  const canLoadMore = hasNextPage && !isFetchingNextPage && !isFetchNextPageError;

  async function onPull() {
    setPulling(true);
    await refetch();
    setPulling(false);
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ActivityRow item={item} />}
      onEndReached={() => {
        if (canLoadMore) void fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} />}
      ListHeaderComponent={
        isRefetchError ? (
          <InlineError
            error={error}
            note="Showing activity loaded earlier."
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : null
      }
      ListEmptyComponent={
        <ThemedText type="small" themeColor="textSecondary">
          No activity yet.
        </ThemedText>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {isFetchingNextPage ? (
            <ActivityIndicator color={theme.tint} />
          ) : isFetchNextPageError ? (
            <>
              <ThemedText type="small" themeColor="danger">
                Couldn’t load more activity.
              </ThemedText>
              <Button title="Try again" variant="secondary" onPress={() => fetchNextPage()} />
            </>
          ) : hasNextPage ? (
            // Fallback for when the list is too short to scroll and trigger onEndReached.
            <Button title="Load more" variant="secondary" onPress={() => fetchNextPage()} />
          ) : items.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              That’s everything.
            </ThemedText>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
});
