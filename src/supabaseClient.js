import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// تنظيف الرابط تلقائياً لحذف المسار الفرعي أو العلامات المائلة الزائدة
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim();
  // حذف /rest/v1/ أو /rest/v1
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
  // حذف أي علامة مائلة متبقية في النهاية
  if (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
