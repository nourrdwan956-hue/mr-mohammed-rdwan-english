import { supabase } from './supabaseClient';

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUp(email, password, fullName, phone, role = 'student') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, role },
    },
  });
  if (error) return { data, error };
  // بعد إنشاء الحساب، نقوم بإنشاء صف في جدول profiles
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: data.user.id, full_name: fullName, phone, role }]);
    if (profileError) console.error('Error creating profile:', profileError);
  }
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}