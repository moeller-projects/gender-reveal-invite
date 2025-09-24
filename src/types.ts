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

