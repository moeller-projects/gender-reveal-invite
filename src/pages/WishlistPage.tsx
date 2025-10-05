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

const getGraceMinutes = () => {
  const raw = Number(import.meta.env.VITE_WISHLIST_GRACE_MINUTES ?? 30);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30;
};

const generateToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

type EnrichedItem = {
  item: WishlistItem;
  expiresAtMs: number | null;
  isExpired: boolean;
  isClaimed: boolean;
};

export default function WishlistPage() {
  const { items, loading, error } = useWishlistItems();
  const { t } = useTranslation();
  const [tokens, setTokens] = useState<TokenMap>(() => readStoredTokens());
  const [pendingActions, setPendingActions] = useState<Record<string, 'claim' | 'release' | null>>({});
  const [notice, setNotice] = useState<Notice | null>(null);

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

  const enriched = useMemo(() => {
    const now = Date.now();
    return items.map((item) => {
      const expiresAtMs = item.claimExpiresAt ? item.claimExpiresAt.toMillis() : null;
      const isExpired = Boolean(item.isClaimed && expiresAtMs && expiresAtMs <= now);
      const isClaimed = item.isClaimed && !isExpired;
      return { item, expiresAtMs, isExpired, isClaimed } satisfies EnrichedItem;
    });
  }, [items]);

  const partitioned = useMemo(() => {
    const available: EnrichedItem[] = [];
    const claimed: EnrichedItem[] = [];

    enriched.forEach((entry) => {
      if (entry.isClaimed) {
        claimed.push(entry);
      } else {
        available.push(entry);
      }
    });

    const sortByTitle = (a: EnrichedItem, b: EnrichedItem) =>
      a.item.title.localeCompare(b.item.title, undefined, { sensitivity: 'base' });

    available.sort(sortByTitle);
    claimed.sort(sortByTitle);

    return { available, claimed };
  }, [enriched]);

  const showNotice = useCallback((type: Notice['type'], message: string) => {
    setNotice({ type, message });
  }, []);

  const handleClaim = useCallback(
    async (entry: EnrichedItem) => {
      const id = entry.item.id;
      setPendingActions((prev) => ({ ...prev, [id]: 'claim' }));
      const token = generateToken();
      try {
        await claimWishlistItem({ id, token, graceMinutes: getGraceMinutes() });
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
    async (entry: EnrichedItem) => {
      const id = entry.item.id;
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
    async (entry: EnrichedItem) => {
      if (typeof window === 'undefined') return;
      const base = (import.meta.env.VITE_WISHLIST_SHARE_BASE_URL as string | undefined) ?? window.location.origin;
      const url = new URL(`/wishlist?item=${entry.item.id}`, base).toString();

      try {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: entry.item.title,
            text: entry.item.description ?? undefined,
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

  const countdownFormatter = useCallback(
    (secondsRemaining: number) => {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      return t('wishlist.claim_timer', {
        minutes,
        seconds: seconds.toString().padStart(2, '0'),
      });
    },
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-2xl font-semibold mb-2">{t('wishlist.title')}</h2>
        <p className="text-neutral-600 text-sm">{t('wishlist.description')}</p>
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

      {!loading && !error && partitioned.available.length === 0 && partitioned.claimed.length === 0 && (
        <div className="rounded-md border bg-white px-4 py-6 text-center text-neutral-600">
          {t('wishlist.empty')}
        </div>
      )}

      {partitioned.available.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">{t('wishlist.available_section')}</h3>
          <div className="space-y-4">
            {partitioned.available.map((entry) => (
              <WishlistItemCard
                key={entry.item.id}
                item={entry.item}
                isClaimed={entry.isClaimed}
                isExpired={entry.isExpired}
                isOwnClaim={Boolean(entry.item.claimToken && tokens[entry.item.id] === entry.item.claimToken)}
                onClaim={() => handleClaim(entry)}
                onRelease={() => handleRelease(entry)}
                onShare={() => handleShare(entry)}
                pendingAction={pendingActions[entry.item.id] ?? null}
                shareLabel={t('wishlist.share')}
                claimLabel={t('wishlist.claim')}
                claimingLabel={t('wishlist.claiming')}
                releaseLabel={t('wishlist.release')}
                releasingLabel={t('wishlist.releasing')}
                reservedLabel={t('wishlist.reserved')}
                ownReservationLabel={t('wishlist.reserved_by_you')}
                expiredLabel={t('wishlist.expired')}
                countdownFormatter={countdownFormatter}
                expiresAtMs={entry.expiresAtMs}
              />
            ))}
          </div>
        </section>
      )}

      {partitioned.claimed.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">{t('wishlist.claimed_section')}</h3>
          <div className="space-y-4">
            {partitioned.claimed.map((entry) => (
              <WishlistItemCard
                key={entry.item.id}
                item={entry.item}
                isClaimed={entry.isClaimed}
                isExpired={entry.isExpired}
                isOwnClaim={Boolean(entry.item.claimToken && tokens[entry.item.id] === entry.item.claimToken)}
                onClaim={() => handleClaim(entry)}
                onRelease={() => handleRelease(entry)}
                onShare={() => handleShare(entry)}
                pendingAction={pendingActions[entry.item.id] ?? null}
                shareLabel={t('wishlist.share')}
                claimLabel={t('wishlist.claim')}
                claimingLabel={t('wishlist.claiming')}
                releaseLabel={t('wishlist.release')}
                releasingLabel={t('wishlist.releasing')}
                reservedLabel={t('wishlist.reserved')}
                ownReservationLabel={t('wishlist.reserved_by_you')}
                expiredLabel={t('wishlist.expired')}
                countdownFormatter={countdownFormatter}
                expiresAtMs={entry.expiresAtMs}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
