

// lib/auth.js
import { supabase } from './supabaseClient';

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email, password, fullName, phone, role = 'student') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || null,
        role: role,
      },
    },
  });
  if (error) return { data, error };
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: data.user.id, full_name: fullName, phone, role }]);
    if (profileError) console.error('Profile error:', profileError);
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

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
  return { data, error };
}