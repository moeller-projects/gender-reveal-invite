import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type UpdateData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WishlistItem, WishlistItemInput, WishlistItemUpdate } from '../types';

const COLLECTION_NAME = 'wishlistItems';
const wishlistCollection = collection(db, COLLECTION_NAME);

const sanitizeOptional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const toWishlistItem = (snapshot: QueryDocumentSnapshot<DocumentData>): WishlistItem => {
  const data = snapshot.data() as DocumentData;

  return {
    id: snapshot.id,
    title: (data.title as string) ?? '',
    description: (data.description as string | null) ?? undefined,
    link: (data.link as string | null) ?? undefined,
    imageUrl: (data.imageUrl as string | null) ?? undefined,
    priceRange: (data.priceRange as string | null) ?? undefined,
    category: (data.category as string | null) ?? undefined,
    isClaimed: Boolean(data.isClaimed),
    claimToken: (data.claimToken as string | null) ?? null,
    claimExpiresAt: (data.claimExpiresAt as Timestamp | null | undefined) ?? null,
    createdAt: data.createdAt as Timestamp | undefined,
    updatedAt: data.updatedAt as Timestamp | undefined,
  };
};

export type WishlistUnsubscribe = () => void;

export const subscribeToWishlist = (
  onNext: (items: WishlistItem[]) => void,
  onError: (error: Error) => void
): WishlistUnsubscribe =>
  onSnapshot(
    wishlistCollection,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => toWishlistItem(docSnap));
      onNext(items);
    },
    (error) => {
      onError(error);
    }
  );

export async function createWishlistItem(input: WishlistItemInput) {
  const title = input.title.trim();
  if (!title) {
    throw new Error('wishlist/title-required');
  }

  const payload = {
    title,
    description: sanitizeOptional(input.description),
    link: sanitizeOptional(input.link),
    imageUrl: sanitizeOptional(input.imageUrl),
    priceRange: sanitizeOptional(input.priceRange),
    category: sanitizeOptional(input.category),
    isClaimed: false,
    claimToken: null,
    claimExpiresAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await addDoc(wishlistCollection, payload);
}

export async function updateWishlistItem(id: string, update: WishlistItemUpdate) {
  const ref = doc(wishlistCollection, id);
  const payload: UpdateData<DocumentData> = {
    updatedAt: serverTimestamp(),
  };

  if (update.title !== undefined) {
    const trimmed = update.title.trim();
    if (!trimmed) {
      throw new Error('wishlist/title-required');
    }
    payload.title = trimmed;
  }

  if (update.description !== undefined) payload.description = sanitizeOptional(update.description);
  if (update.link !== undefined) payload.link = sanitizeOptional(update.link);
  if (update.imageUrl !== undefined) payload.imageUrl = sanitizeOptional(update.imageUrl);
  if (update.priceRange !== undefined) payload.priceRange = sanitizeOptional(update.priceRange);
  if (update.category !== undefined) payload.category = sanitizeOptional(update.category);

  await updateDoc(ref, payload);
}

export async function deleteWishlistItem(id: string) {
  await deleteDoc(doc(wishlistCollection, id));
}

export async function claimWishlistItem(options: { id: string; token: string }) {
  const { id, token } = options;
  const ref = doc(wishlistCollection, id);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error('wishlist/not-found');
    }

    const data = snap.data() as DocumentData;
    const alreadyClaimed = Boolean(data.isClaimed) && Boolean(data.claimToken);

    if (alreadyClaimed && data.claimToken !== token) {
      throw new Error('wishlist/already-claimed');
    }

    transaction.update(ref, {
      isClaimed: true,
      claimToken: token,
      claimExpiresAt: null,
      updatedAt: serverTimestamp(),
      lastClaimedAt: serverTimestamp(),
    });
  });
}

export async function releaseWishlistItem(options: { id: string; token?: string; force?: boolean }) {
  const { id, token, force = false } = options;
  const ref = doc(wishlistCollection, id);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error('wishlist/not-found');
    }

    const data = snap.data() as DocumentData;

    if (!data.isClaimed) {
      transaction.update(ref, {
        claimToken: null,
        claimExpiresAt: null,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    if (!force && data.claimToken && data.claimToken !== token) {
      throw new Error('wishlist/not-allowed');
    }

    transaction.update(ref, {
      isClaimed: false,
      claimToken: null,
      claimExpiresAt: null,
      updatedAt: serverTimestamp(),
    });
  });
}
