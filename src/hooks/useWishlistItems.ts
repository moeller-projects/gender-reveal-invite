import { useEffect, useState } from 'react';
import type { WishlistItem } from '../types';
import { subscribeToWishlist } from '../lib/wishlist';

export function useWishlistItems() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {
    items,
    loading,
    error,
  } as const;
}
