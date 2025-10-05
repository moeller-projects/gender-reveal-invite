import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FirebaseError } from 'firebase/app';
import { useWishlistItems } from '../hooks/useWishlistItems';
import { createWishlistItem, deleteWishlistItem, releaseWishlistItem, updateWishlistItem } from '../lib/wishlist';

const ACCESS_STORAGE_KEY = 'wishlist-admin-access';

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().max(500).optional().or(z.literal('').transform(() => '')),
  link: z
    .string()
    .url({ message: 'invalid' })
    .optional()
    .or(z.literal('').transform(() => '')),
  imageUrl: z
    .string()
    .url({ message: 'invalid' })
    .optional()
    .or(z.literal('').transform(() => '')),
  priceRange: z.string().max(120).optional().or(z.literal('').transform(() => '')),
  category: z.string().max(120).optional().or(z.literal('').transform(() => '')),
});

type FormState = z.infer<typeof formSchema>;

const emptyForm: FormState = {
  title: '',
  description: '',
  link: '',
  imageUrl: '',
  priceRange: '',
  category: '',
};

type Notice = {
  type: 'success' | 'error' | 'info';
  message: string;
};

const isPermissionDenied = (error: unknown) =>
  error instanceof FirebaseError && error.code === 'permission-denied';

export default function WishlistAdminPage() {
  const { t } = useTranslation();
  const { items, loading, error } = useWishlistItems();
  const accessCode = import.meta.env.VITE_ADMIN_ACCESS_CODE as string | undefined;

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(ACCESS_STORAGE_KEY);
    return Boolean(accessCode && stored && stored === accessCode);
  });
  const [codeInput, setCodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FormState>(emptyForm);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessCode || typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_STORAGE_KEY, accessCode);
  }, [isAuthenticated, accessCode]);

  const handleAuthenticate = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!accessCode) {
        setAuthError(t('wishlistAdmin.error_no_code'));
        return;
      }
      if (codeInput.trim() === accessCode) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setAuthError(t('wishlistAdmin.error_invalid_code'));
      }
    },
    [accessCode, codeInput, t]
  );

  const handleFormChange = useCallback((key: keyof FormState, value: string, editing = false) => {
    if (editing) {
      setEditState((prev) => ({ ...prev, [key]: value }));
    } else {
      setFormState((prev) => ({ ...prev, [key]: value }));
    }
  }, []);

  const parseFormData = useCallback((data: FormState) => {
    const parsed = formSchema.safeParse(data);
    if (!parsed.success) {
      const issues: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === 'string') {
          issues[path] = issue.message === 'invalid' ? 'invalid' : 'required';
        }
      });
      return { success: false as const, errors: issues };
    }

    return {
      success: true as const,
      data: parsed.data,
    };
  }, []);

  const resetForm = useCallback(() => {
    setFormState(emptyForm);
    setFormErrors({});
  }, []);

  const showNotice = useCallback((type: Notice['type'], message: string) => {
    setNotice({ type, message });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsed = parseFormData(formState);
      if (!parsed.success) {
        setFormErrors(parsed.errors);
        return;
      }

      setIsSubmitting(true);
      setFormErrors({});

      try {
        await createWishlistItem(parsed.data);
        resetForm();
        showNotice('success', t('wishlistAdmin.create_success'));
      } catch (err) {
        console.error('create item failed', err);
        showNotice('error', isPermissionDenied(err) ? t('wishlistAdmin.error_permission') : t('wishlistAdmin.error_generic'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, parseFormData, resetForm, showNotice, t]
  );

  const startEdit = useCallback(
    (id: string) => {
      if (busyItem) return;
      const item = items.find((itm) => itm.id === id);
      if (!item) return;
      setEditingId(id);
      setEditState({
        title: item.title ?? '',
        description: item.description ?? '',
        link: item.link ?? '',
        imageUrl: item.imageUrl ?? '',
        priceRange: item.priceRange ?? '',
        category: item.category ?? '',
      });
      setEditErrors({});
    },
    [busyItem, items]
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditErrors({});
  }, []);

  const saveEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>, id: string) => {
      event.preventDefault();
      const parsed = parseFormData(editState);
      if (!parsed.success) {
        setEditErrors(parsed.errors);
        return;
      }

      setBusyItem(id);
      setEditErrors({});

      try {
        await updateWishlistItem(id, parsed.data);
        setEditingId(null);
        showNotice('success', t('wishlistAdmin.update_success'));
      } catch (err) {
        console.error('update item failed', err);
        showNotice('error', isPermissionDenied(err) ? t('wishlistAdmin.error_permission') : t('wishlistAdmin.error_generic'));
      } finally {
        setBusyItem(null);
      }
    },
    [editState, parseFormData, showNotice, t]
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (!window.confirm(t('wishlistAdmin.delete_confirm'))) return;
      setBusyItem(id);
      try {
        await deleteWishlistItem(id);
        showNotice('success', t('wishlistAdmin.delete_success'));
      } catch (err) {
        console.error('delete failed', err);
        showNotice('error', isPermissionDenied(err) ? t('wishlistAdmin.error_permission') : t('wishlistAdmin.error_generic'));
      } finally {
        setBusyItem(null);
      }
    },
    [showNotice, t]
  );

  const releaseItem = useCallback(
    async (id: string) => {
      setBusyItem(id);
      try {
        await releaseWishlistItem({ id, force: true });
        showNotice('success', t('wishlistAdmin.release_success'));
      } catch (err) {
        console.error('release failed', err);
        showNotice('error', isPermissionDenied(err) ? t('wishlistAdmin.error_permission') : t('wishlistAdmin.error_generic'));
      } finally {
        setBusyItem(null);
      }
    },
    [showNotice, t]
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isClaimed !== b.isClaimed) {
        return a.isClaimed ? 1 : -1;
      }
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });
  }, [items]);

  if (!accessCode) {
    return (
      <div className="rounded-lg border bg-white p-6 text-neutral-700">
        {t('wishlistAdmin.missing_access_code')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-xl font-semibold mb-3">{t('wishlistAdmin.title')}</h2>
          <p className="text-sm text-neutral-600">{t('wishlistAdmin.description')}</p>
        </div>
        <form onSubmit={handleAuthenticate} className="rounded-lg border bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor="access-code">
              {t('wishlistAdmin.access_label')}
            </label>
            <input
              id="access-code"
              type="password"
              autoComplete="off"
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
            />
            {authError && <p className="mt-2 text-sm text-rose-600">{authError}</p>}
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            {t('wishlistAdmin.access_submit')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-2xl font-semibold mb-2">{t('wishlistAdmin.title')}</h2>
        <p className="text-sm text-neutral-600">{t('wishlistAdmin.description')}</p>
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

      <form onSubmit={handleCreate} className="rounded-lg border bg-white p-6 space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">{t('wishlistAdmin.create_heading')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor="title">
              {t('wishlistAdmin.form.title')}
            </label>
            <input
              id="title"
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={formState.title}
              onChange={(event) => handleFormChange('title', event.target.value)}
            />
            {formErrors.title && <p className="mt-1 text-sm text-rose-600">{t('wishlistAdmin.validation.required')}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor="description">
              {t('wishlistAdmin.form.description')}
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={formState.description}
              onChange={(event) => handleFormChange('description', event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor="link">
              {t('wishlistAdmin.form.link')}
            </label>
            <input
              id="link"
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={formState.link}
              onChange={(event) => handleFormChange('link', event.target.value)}
            />
            {formErrors.link && <p className="mt-1 text-sm text-rose-600">{t('wishlistAdmin.validation.invalid_url')}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor="imageUrl">
              {t('wishlistAdmin.form.imageUrl')}
            </label>
            <input
              id="imageUrl"
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={formState.imageUrl}
              onChange={(event) => handleFormChange('imageUrl', event.target.value)}
            />
            {formErrors.imageUrl && <p className="mt-1 text-sm text-rose-600">{t('wishlistAdmin.validation.invalid_url')}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor="priceRange">
              {t('wishlistAdmin.form.priceRange')}
            </label>
            <input
              id="priceRange"
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={formState.priceRange}
              onChange={(event) => handleFormChange('priceRange', event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor="category">
              {t('wishlistAdmin.form.category')}
            </label>
            <input
              id="category"
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={formState.category}
              onChange={(event) => handleFormChange('category', event.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="text-sm text-neutral-600 underline underline-offset-4"
            onClick={resetForm}
            disabled={isSubmitting}
          >
            {t('wishlistAdmin.form.reset')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? t('wishlistAdmin.form.saving') : t('wishlistAdmin.form.save')}
          </button>
        </div>
      </form>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">{t('wishlistAdmin.items_heading')}</h3>
        {loading && <div className="text-sm text-neutral-600">{t('wishlistAdmin.loading')}</div>}
        {error && <div className="text-sm text-rose-700">{t('wishlistAdmin.error_generic')}</div>}
        {!loading && !sortedItems.length && (
          <div className="rounded border bg-white px-4 py-6 text-center text-neutral-600">
            {t('wishlistAdmin.empty')}
          </div>
        )}
        <div className="space-y-4">
          {sortedItems.map((item) => {
            const isEditing = editingId === item.id;
            const expiresAt = item.claimExpiresAt ? item.claimExpiresAt.toDate() : null;
            return (
              <div key={item.id} className="rounded-lg border bg-white p-5">
                {!isEditing ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-neutral-900">{item.title}</h4>
                        {item.description && <p className="text-sm text-neutral-600">{item.description}</p>}
                        <div className="flex flex-wrap gap-2 text-xs text-neutral-500 mt-2">
                          {item.priceRange && <span className="rounded bg-neutral-100 px-2 py-1">{item.priceRange}</span>}
                          {item.category && <span className="rounded bg-neutral-100 px-2 py-1">{item.category}</span>}
                          {item.isClaimed && (
                            <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">
                              {t('wishlistAdmin.status.claimed')}
                            </span>
                          )}
                        </div>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-2 block text-sm text-neutral-900 underline underline-offset-4 break-words"
                          >
                            {item.link}
                          </a>
                        )}
                        {item.imageUrl && (
                          <div className="mt-3">
                            <img src={item.imageUrl} alt="" className="h-32 w-32 rounded object-cover" />
                          </div>
                        )}
                        {item.isClaimed && expiresAt && (
                          <p className="mt-2 text-xs text-neutral-500">
                            {t('wishlistAdmin.status.expires', { date: expiresAt.toLocaleString() })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item.id)}
                          className="inline-flex items-center justify-center rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
                          disabled={Boolean(busyItem)}
                        >
                          {t('wishlistAdmin.actions.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => releaseItem(item.id)}
                          className="inline-flex items-center justify-center rounded border border-amber-400 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
                          disabled={Boolean(busyItem) || !item.isClaimed}
                        >
                          {t('wishlistAdmin.actions.release')}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="inline-flex items-center justify-center rounded border border-rose-400 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
                          disabled={Boolean(busyItem)}
                        >
                          {t('wishlistAdmin.actions.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(event) => saveEdit(event, item.id)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor={`edit-title-${item.id}`}>
                          {t('wishlistAdmin.form.title')}
                        </label>
                        <input
                          id={`edit-title-${item.id}`}
                          className="w-full rounded border border-neutral-300 px-3 py-2"
                          value={editState.title}
                          onChange={(event) => handleFormChange('title', event.target.value, true)}
                        />
                        {editErrors.title && <p className="mt-1 text-sm text-rose-600">{t('wishlistAdmin.validation.required')}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor={`edit-description-${item.id}`}>
                          {t('wishlistAdmin.form.description')}
                        </label>
                        <textarea
                          id={`edit-description-${item.id}`}
                          rows={3}
                          className="w-full rounded border border-neutral-300 px-3 py-2"
                          value={editState.description}
                          onChange={(event) => handleFormChange('description', event.target.value, true)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor={`edit-link-${item.id}`}>
                          {t('wishlistAdmin.form.link')}
                        </label>
                        <input
                          id={`edit-link-${item.id}`}
                          className="w-full rounded border border-neutral-300 px-3 py-2"
                          value={editState.link}
                          onChange={(event) => handleFormChange('link', event.target.value, true)}
                        />
                        {editErrors.link && <p className="mt-1 text-sm text-rose-600">{t('wishlistAdmin.validation.invalid_url')}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor={`edit-image-${item.id}`}>
                          {t('wishlistAdmin.form.imageUrl')}
                        </label>
                        <input
                          id={`edit-image-${item.id}`}
                          className="w-full rounded border border-neutral-300 px-3 py-2"
                          value={editState.imageUrl}
                          onChange={(event) => handleFormChange('imageUrl', event.target.value, true)}
                        />
                        {editErrors.imageUrl && <p className="mt-1 text-sm text-rose-600">{t('wishlistAdmin.validation.invalid_url')}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor={`edit-price-${item.id}`}>
                          {t('wishlistAdmin.form.priceRange')}
                        </label>
                        <input
                          id={`edit-price-${item.id}`}
                          className="w-full rounded border border-neutral-300 px-3 py-2"
                          value={editState.priceRange}
                          onChange={(event) => handleFormChange('priceRange', event.target.value, true)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-800 mb-1" htmlFor={`edit-category-${item.id}`}>
                          {t('wishlistAdmin.form.category')}
                        </label>
                        <input
                          id={`edit-category-${item.id}`}
                          className="w-full rounded border border-neutral-300 px-3 py-2"
                          value={editState.category}
                          onChange={(event) => handleFormChange('category', event.target.value, true)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-sm text-neutral-600 underline underline-offset-4"
                        disabled={busyItem === item.id}
                      >
                        {t('wishlistAdmin.form.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={busyItem === item.id}
                        className="inline-flex items-center justify-center rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {busyItem === item.id ? t('wishlistAdmin.form.saving') : t('wishlistAdmin.form.save')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
