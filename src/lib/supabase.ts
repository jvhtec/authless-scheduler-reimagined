import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://syldobdcdsgfgjtbuwxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bGRvYmRjZHNnZmdqdGJ1d3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4MjI0MTcsImV4cCI6MjAyNTM5ODQxN30.RdoHF1kJRTHgQBsOGo-E1nxqHe9MhJEHXwzwoeFAqbg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);