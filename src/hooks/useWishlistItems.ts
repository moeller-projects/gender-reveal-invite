import { useEffect, useRef, useState } from 'react';
import type { WishlistItem } from '../types';
import { releaseWishlistItem, subscribeToWishlist } from '../lib/wishlist';

export function useWishlistItems() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handlingExpired = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribe = subscribeToWishlist(
      (nextItems) => {
        setItems(nextItems);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const now = Date.now();

    items.forEach((item) => {
      if (!item.isClaimed || !item.claimExpiresAt) return;
      const expiryMs = item.claimExpiresAt.toDate().getTime();
      if (expiryMs <= now && !handlingExpired.current.has(item.id)) {
        handlingExpired.current.add(item.id);
        releaseWishlistItem({ id: item.id, force: true })
          .catch(() => undefined)
          .finally(() => {
            handlingExpired.current.delete(item.id);
          });
      }
    });
  }, [items]);

  return {
    items,
    loading,
    error,
  } as const;
}
