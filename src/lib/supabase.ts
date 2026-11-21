import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseCredentials(): { url: string; key: string; source: 'env' | 'local' | 'none' } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (envUrl && envUrl.startsWith('http') && envKey && envKey.length > 10) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('shop_erp_supabase_url') || '';
    const localKey = localStorage.getItem('shop_erp_supabase_anon_key') || '';
    if (localUrl && localUrl.startsWith('http') && localKey && localKey.length > 10) {
      return { url: localUrl, key: localKey, source: 'local' };
    }
  }

  return { url: '', key: '', source: 'none' };
}

export function saveCustomSupabaseCredentials(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim() && key.trim()) {
      localStorage.setItem('shop_erp_supabase_url', url.trim());
      localStorage.setItem('shop_erp_supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('shop_erp_supabase_url');
      localStorage.removeItem('shop_erp_supabase_anon_key');
    }
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds.url || !creds.key) {
    return null;
  }
  return createClient(creds.url, creds.key);
}

export function isConfigured(): boolean {
  const creds = getSupabaseCredentials();
  return Boolean(creds.url && creds.key);
}

export const isSupabaseConfigured = isConfigured();

export const supabase = getSupabaseClient();
