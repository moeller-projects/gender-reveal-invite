import { useEffect, useMemo, useState } from 'react';
import type { WishlistItem } from '../types';

export type WishlistItemCardProps = {
  item: WishlistItem;
  isClaimed: boolean;
  isExpired: boolean;
  isOwnClaim: boolean;
  onClaim: () => Promise<void>;
  onRelease: () => Promise<void>;
  onShare: () => Promise<void>;
  shareLabel: string;
  claimLabel: string;
  claimingLabel: string;
  releaseLabel: string;
  releasingLabel: string;
  reservedLabel: string;
  ownReservationLabel: string;
  expiredLabel: string;
  pendingAction: 'claim' | 'release' | null;
  countdownFormatter: (secondsRemaining: number) => string;
  expiresAtMs: number | null;
};

export default function WishlistItemCard({
  item,
  isClaimed,
  isExpired,
  isOwnClaim,
  onClaim,
  onRelease,
  onShare,
  shareLabel,
  claimLabel,
  claimingLabel,
  releaseLabel,
  releasingLabel,
  reservedLabel,
  ownReservationLabel,
  expiredLabel,
  pendingAction,
  countdownFormatter,
  expiresAtMs,
}: WishlistItemCardProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (!expiresAtMs) return 0;
    return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAtMs) {
      setSecondsRemaining(0);
      return;
    }

    setSecondsRemaining(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)));

    const id = window.setInterval(() => {
      const next = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setSecondsRemaining(next);
      if (next === 0) {
        window.clearInterval(id);
      }
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [expiresAtMs]);

  const countdownLabel = useMemo(() => {
    if (!expiresAtMs || secondsRemaining <= 0) return null;
    return countdownFormatter(secondsRemaining);
  }, [countdownFormatter, expiresAtMs, secondsRemaining]);

  const showClaimButton = !isClaimed || isExpired;
  const showReleaseButton = isClaimed && isOwnClaim && !isExpired;

  return (
    <article className="flex flex-col gap-4 rounded-lg border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-neutral-900">{item.title}</h3>
          {item.description && <p className="text-neutral-600 text-sm">{item.description}</p>}
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            {item.priceRange && (
              <span className="rounded bg-neutral-100 px-2 py-1 text-neutral-700">{item.priceRange}</span>
            )}
            {item.category && (
              <span className="rounded bg-neutral-100 px-2 py-1 text-neutral-700">{item.category}</span>
            )}
            {isClaimed && !isExpired && (
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">
                {isOwnClaim ? ownReservationLabel : reservedLabel}
              </span>
            )}
            {isExpired && (
              <span className="rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-600">
                {expiredLabel}
              </span>
            )}
          </div>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900 underline underline-offset-4 break-all"
            >
              {item.link}
            </a>
          )}
        </div>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt=""
            className="h-32 w-32 flex-none rounded-md object-cover"
            loading="lazy"
          />
        )}
      </div>

      {countdownLabel && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {countdownLabel}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {showClaimButton && (
          <button
            type="button"
            onClick={onClaim}
            disabled={pendingAction === 'claim'}
            className="inline-flex items-center justify-center rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pendingAction === 'claim' ? claimingLabel : claimLabel}
          </button>
        )}
        {showReleaseButton && (
          <button
            type="button"
            onClick={onRelease}
            disabled={pendingAction === 'release'}
            className="inline-flex items-center justify-center rounded border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
          >
            {pendingAction === 'release' ? releasingLabel : releaseLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center justify-center gap-2 rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          {shareLabel}
        </button>
      </div>
    </article>
  );
}
