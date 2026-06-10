import { createClient } from '@supabase/supabase-js';
import { createMMKV } from 'react-native-mmkv';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://fruqcgeqxhboprqbtlkv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydXFjZ2VxeGhib3BycWJ0bGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTM4MzUsImV4cCI6MjA5NjMyOTgzNX0.hcUJSCpjXOJyBODmmj7-dbOlt3S3mbyf5Bfb0GpQrq4';

export const storage = createMMKV({ id: 'supabase-storage' });

const mmkvStorage = {
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  getItem: (key: string) => {
    const value = storage.getString(key);
    return value ?? null;
  },
  removeItem: (key: string) => {
    storage.remove(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
