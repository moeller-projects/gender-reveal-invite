import { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { db } from '../lib/firebase';
import type { RSVPData } from '../types';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().optional().or(z.literal('').transform(() => undefined)),
  totalPersons: z.coerce.number().int().min(1).max(20),
  dietary: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  rsvp: z.boolean(),
  needsCouch: z.boolean(),
  message: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  honeypot: z.string().max(0).optional().default(''),
});

export default function RSVPForm() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || undefined, []);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    totalPersons: 1,
    dietary: '',
    rsvp: true,
    needsCouch: false,
    message: '',
    honeypot: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const ref = doc(collection(db, 'rsvps'), token);
        const snap = await getDoc(ref);
        if (snap.exists()) {
        const d = snap.data() as Partial<RSVPData>;
          setForm((f) => ({
            ...f,
            name: d.name ?? '',
            email: d.email ?? '',
            phone: d.phone ?? '',
            totalPersons: typeof d.totalPersons === 'number' ? d.totalPersons : 1,
            dietary: d.dietary ?? '',
            rsvp: !!d.rsvp,
            needsCouch: !!d.needsCouch,
            message: d.message ?? '',
          }));
          setSuccess(t('form.prefill_success'));
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [token, t]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    const parsed = schema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      totalPersons: form.totalPersons,
      dietary: form.dietary,
      rsvp: form.rsvp,
      needsCouch: form.needsCouch,
      message: form.message,
      honeypot: form.honeypot,
    });

    if (!parsed.success) {
      setLoading(false);
      setError(t('form.error'));
      return;
    }

    // honeypot caught
    if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
      setLoading(false);
      setSuccess(t('form.success'));
      return;
    }

    const payload: RSVPData = {
      name: parsed.data.name,
      email: parsed.data.email ?? '',
      phone: parsed.data.phone ?? '',
      totalPersons: parsed.data.totalPersons,
      dietary: parsed.data.dietary ?? '',
      rsvp: parsed.data.rsvp,
      needsCouch: parsed.data.needsCouch,
      message: parsed.data.message ?? '',
      language: i18n.resolvedLanguage,
    };

    try {
      if (token) {
        await setDoc(doc(collection(db, 'rsvps'), token), {
          ...payload,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'rsvps'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setSuccess(t('form.success'));
    } catch (err) {
      console.error(err);
      setError(t('form.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {success && (
        <div className="rounded-md bg-emerald-50 text-emerald-700 px-3 py-2 border border-emerald-200">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 border border-rose-200">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">{t('form.name')}</label>
          <input id="name" name="name" required className="w-full rounded border border-neutral-300 px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="totalPersons">{t('form.totalPersons')}</label>
          <input id="totalPersons" name="totalPersons" type="number" min={1} max={20} required className="w-full rounded border border-neutral-300 px-3 py-2" value={form.totalPersons} onChange={(e) => setForm({ ...form, totalPersons: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">{t('form.email')}</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" className="w-full rounded border border-neutral-300 px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="phone">{t('form.phone')}</label>
          <input id="phone" name="phone" placeholder="+49..." className="w-full rounded border border-neutral-300 px-3 py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="dietary">{t('form.dietary')}</label>
        <input id="dietary" name="dietary" className="w-full rounded border border-neutral-300 px-3 py-2" value={form.dietary} onChange={(e) => setForm({ ...form, dietary: e.target.value })} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <span className="block text-sm font-medium mb-1">{t('form.rsvp')}</span>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="rsvp" value="yes" checked={form.rsvp} onChange={() => setForm({ ...form, rsvp: true })} className="size-4" />
              <span>{t('form.rsvp_yes')}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="rsvp" value="no" checked={!form.rsvp} onChange={() => setForm({ ...form, rsvp: false })} className="size-4" />
              <span>{t('form.rsvp_no')}</span>
            </label>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 mt-6 sm:mt-0">
          <input type="checkbox" name="needsCouch" className="size-4" checked={form.needsCouch} onChange={(e) => setForm({ ...form, needsCouch: e.target.checked })} />
          <span>{t('form.needsCouch')}</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="message">{t('form.message')}</label>
        <textarea id="message" name="message" rows={4} className="w-full rounded border border-neutral-300 px-3 py-2" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>

      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label>
          {t('form.honeypot')}
          <input name="honeypot" autoComplete="off" tabIndex={-1} value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded bg-neutral-900 text-white px-4 py-2 disabled:opacity-60"
      >
        {loading ? t('form.submitting') : t('form.submit')}
      </button>
    </form>
  );
}
