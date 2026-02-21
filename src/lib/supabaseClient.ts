import { createClient } from '@supabase/supabase-js';

// .env.localファイルで設定した環境変数を読み込みます
// 未設定時にもアプリがクラッシュしないようにダミーの値を設定していますが、正しく動作させるには
// NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が必要です。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxxxxxxx.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key';

export const supabase = createClient(supabaseUrl, supabaseKey);
