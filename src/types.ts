import type { Timestamp } from 'firebase/firestore';

export type RSVPData = {
  name: string;
  email: string;
  phone: string;
  totalPersons: number;
  dietary: string;
  rsvp: boolean; // true = attending
  needsCouch: boolean;
  message?: string;
  language?: string;
  createdAt?: string;
};

export type WishlistItem = {
  id: string;
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  priceRange?: string;
  category?: string;
  isClaimed: boolean;
  claimToken?: string | null;
  claimExpiresAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WishlistItemInput = {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  priceRange?: string;
  category?: string;
};

export type WishlistItemUpdate = Partial<WishlistItemInput> & {
  title?: string;
};

