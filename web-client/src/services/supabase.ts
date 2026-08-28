import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fruqcgeqxhboprqbtlkv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydXFjZ2VxeGhib3BycWJ0bGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTM4MzUsImV4cCI6MjA5NjMyOTgzNX0.hcUJSCpjXOJyBODmmj7-dbOlt3S3mbyf5Bfb0GpQrq4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
