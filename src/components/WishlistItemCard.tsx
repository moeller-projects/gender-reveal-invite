import type { WishlistItem } from '../types';

export type WishlistItemCardProps = {
  item: WishlistItem;
  isClaimed: boolean;
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
  pendingAction: 'claim' | 'release' | null;
};

export default function WishlistItemCard({
  item,
  isClaimed,
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
  pendingAction,
}: WishlistItemCardProps) {
  const showClaimButton = !isClaimed;
  const showReleaseButton = isClaimed && isOwnClaim;

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
            {isClaimed && (
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">
                {isOwnClaim ? ownReservationLabel : reservedLabel}
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
