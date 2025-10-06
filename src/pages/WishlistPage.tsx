import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { claimWishlistItem, releaseWishlistItem } from '../lib/wishlist';
import { useWishlistItems } from '../hooks/useWishlistItems';
import WishlistItemCard from '../components/WishlistItemCard';
import type { WishlistItem } from '../types';

const TOKEN_STORAGE_KEY = 'wishlist-claim-tokens';

type TokenMap = Record<string, string>;

type Notice = {
  type: 'success' | 'error' | 'info';
  message: string;
};

const readStoredTokens = (): TokenMap => {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as TokenMap;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch (err) {
    console.error('Unable to read wishlist tokens', err);
    return {};
  }
};

const generateToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function WishlistPage() {
  const { items, loading, error } = useWishlistItems();
  const { t } = useTranslation();
  const [tokens, setTokens] = useState<TokenMap>(() => readStoredTokens());
  const [pendingActions, setPendingActions] = useState<Record<string, 'claim' | 'release' | null>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'claimed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'newest'>('alpha');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }, [tokens]);

  useEffect(() => {
    setTokens((prev) => {
      if (!items.length) return prev;
      const next = { ...prev };
      let changed = false;
      for (const [id, token] of Object.entries(prev)) {
        const current = items.find((itm) => itm.id === id);
        if (!current || !current.isClaimed || current.claimToken !== token) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const setToken = useCallback((id: string, token: string) => {
    setTokens((prev) => ({ ...prev, [id]: token }));
  }, []);

  const removeToken = useCallback((id: string) => {
    setTokens((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const categories = useMemo(() => {
    const bag = new Set<string>();
    items.forEach((item) => {
      const category = item.category?.trim();
      if (category) {
        bag.add(category);
      }
    });
    return Array.from(bag).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [items]);

  useEffect(() => {
    if (categoryFilter === 'all') return;
    if (!categories.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categories, categoryFilter]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === 'available' && item.isClaimed) {
        return false;
      }
      if (statusFilter === 'claimed' && !item.isClaimed) {
        return false;
      }
      if (categoryFilter !== 'all') {
        const category = item.category?.trim();
        if (!category || category !== categoryFilter) {
          return false;
        }
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter]);

  const sortedItems = useMemo(() => {
    const alphaSort = (a: WishlistItem, b: WishlistItem) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

    const list = [...filteredItems];
    if (sortOrder === 'alpha') {
      return list.sort(alphaSort);
    }

    return list.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? a.updatedAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? b.updatedAt?.toMillis?.() ?? 0;
      if (aTime === bTime) {
        return alphaSort(a, b);
      }
      return bTime - aTime;
    });
  }, [filteredItems, sortOrder]);

  const partitioned = useMemo(() => {
    const available: WishlistItem[] = [];
    const claimed: WishlistItem[] = [];

    sortedItems.forEach((item) => {
      if (item.isClaimed) {
        claimed.push(item);
      } else {
        available.push(item);
      }
    });

    return { available, claimed };
  }, [sortedItems]);

  const showNotice = useCallback((type: Notice['type'], message: string) => {
    setNotice({ type, message });
  }, []);

  const handleClaim = useCallback(
    async (item: WishlistItem) => {
      const id = item.id;
      setPendingActions((prev) => ({ ...prev, [id]: 'claim' }));
      const token = generateToken();
      try {
        await claimWishlistItem({ id, token });
        setToken(id, token);
        showNotice('success', t('wishlist.claim_success'));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'wishlist/unknown';
        if (errorMessage === 'wishlist/already-claimed') {
          showNotice('error', t('wishlist.error_already_claimed'));
        } else {
          showNotice('error', t('wishlist.error_generic'));
        }
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [setToken, showNotice, t]
  );

  const handleRelease = useCallback(
    async (item: WishlistItem) => {
      const id = item.id;
      const token = tokens[id];
      if (!token) {
        showNotice('error', t('wishlist.error_no_token'));
        return;
      }

      setPendingActions((prev) => ({ ...prev, [id]: 'release' }));

      try {
        await releaseWishlistItem({ id, token });
        removeToken(id);
        showNotice('success', t('wishlist.release_success'));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'wishlist/unknown';
        if (errorMessage === 'wishlist/not-allowed') {
          showNotice('error', t('wishlist.error_not_allowed'));
        } else {
          showNotice('error', t('wishlist.error_generic'));
        }
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [removeToken, showNotice, t, tokens]
  );

  const handleShare = useCallback(
    async (item: WishlistItem) => {
      if (typeof window === 'undefined') return;
      const base = (import.meta.env.VITE_WISHLIST_SHARE_BASE_URL as string | undefined) ?? window.location.origin;
      const url = new URL(`/wishlist?item=${item.id}`, base).toString();

      try {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: item.title,
            text: item.description ?? undefined,
            url,
          });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          showNotice('success', t('wishlist.share_copied'));
        } else {
          showNotice('info', t('wishlist.share_copy', { url }));
        }
      } catch (err) {
        console.error('share failed', err);
        showNotice('error', t('wishlist.share_error'));
      }
    },
    [showNotice, t]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-2xl font-semibold mb-2">{t('wishlist.title')}</h2>
        <p className="text-neutral-600 text-sm">{t('wishlist.description')}</p>
        <p className="text-neutral-600 text-sm mt-2">{t('wishlist.help')}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1" htmlFor="wishlist-status-filter">
              {t('wishlist.filters.status_label')}
            </label>
            <select
              id="wishlist-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'available' | 'claimed')}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">{t('wishlist.filters.status.all')}</option>
              <option value="available">{t('wishlist.filters.status.available')}</option>
              <option value="claimed">{t('wishlist.filters.status.claimed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1" htmlFor="wishlist-category-filter">
              {t('wishlist.filters.category_label')}
            </label>
            <select
              id="wishlist-category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
              disabled={categories.length === 0}
            >
              <option value="all">{t('wishlist.filters.category_all')}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="mt-1 text-xs text-neutral-500">{t('wishlist.filters.category_empty')}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1" htmlFor="wishlist-sort-order">
              {t('wishlist.filters.sort_label')}
            </label>
            <select
              id="wishlist-sort-order"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'alpha' | 'newest')}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="alpha">{t('wishlist.filters.sort.alpha')}</option>
              <option value="newest">{t('wishlist.filters.sort.newest')}</option>
            </select>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : notice.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      {loading && (
        <div className="rounded-md border bg-white px-4 py-6 text-center text-neutral-600">
          {t('wishlist.loading')}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-6 text-center text-rose-700">
          {t('wishlist.error_generic')}
        </div>
      )}

      {!loading && !error && items.length > 0 && sortedItems.length === 0 && (
        <div className="rounded-md border bg-white px-4 py-6 text-center text-neutral-600">
          {t('wishlist.filtered_empty')}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-md border bg-white px-4 py-6 text-center text-neutral-600">
          {t('wishlist.empty')}
        </div>
      )}

      {partitioned.available.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">{t('wishlist.available_section')}</h3>
          <div className="space-y-4">
            {partitioned.available.map((item) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                isClaimed={item.isClaimed}
                isOwnClaim={Boolean(item.claimToken && tokens[item.id] === item.claimToken)}
                onClaim={() => handleClaim(item)}
                onRelease={() => handleRelease(item)}
                onShare={() => handleShare(item)}
                pendingAction={pendingActions[item.id] ?? null}
                shareLabel={t('wishlist.share')}
                claimLabel={t('wishlist.claim')}
                claimingLabel={t('wishlist.claiming')}
                releaseLabel={t('wishlist.release')}
                releasingLabel={t('wishlist.releasing')}
                reservedLabel={t('wishlist.reserved')}
                ownReservationLabel={t('wishlist.reserved_by_you')}
              />
            ))}
          </div>
        </section>
      )}

      {partitioned.claimed.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">{t('wishlist.claimed_section')}</h3>
          <div className="space-y-4">
            {partitioned.claimed.map((item) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                isClaimed={item.isClaimed}
                isOwnClaim={Boolean(item.claimToken && tokens[item.id] === item.claimToken)}
                onClaim={() => handleClaim(item)}
                onRelease={() => handleRelease(item)}
                onShare={() => handleShare(item)}
                pendingAction={pendingActions[item.id] ?? null}
                shareLabel={t('wishlist.share')}
                claimLabel={t('wishlist.claim')}
                claimingLabel={t('wishlist.claiming')}
                releaseLabel={t('wishlist.release')}
                releasingLabel={t('wishlist.releasing')}
                reservedLabel={t('wishlist.reserved')}
                ownReservationLabel={t('wishlist.reserved_by_you')}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
