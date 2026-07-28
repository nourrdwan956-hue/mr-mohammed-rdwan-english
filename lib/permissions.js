// lib/permissions.js
import { supabase } from './supabaseClient';

/**
 * الحصول على صلاحيات المساعد الحالي (إذا كان مساعداً)
 * @param {string} userId - معرف المستخدم (من Supabase Auth)
 * @returns {Promise<Array>} مصفوفة الصلاحيات
 */
export const getAssistantPermissions = async (userId) => {
  try {
    // التحقق أولاً من أن المستخدم مساعد (role = 'assistant')
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'assistant') {
      return null; // ليس مساعداً
    }

    // جلب صلاحيات المساعد
    const { data, error } = await supabase
      .from('assistant_permissions')
      .select('*')
      .eq('assistant_id', userId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching assistant permissions:', err);
    return null;
  }
};

/**
 * التحقق من صلاحية معينة لوحدة معينة
 * @param {Array} permissions - مصفوفة الصلاحيات
 * @param {string} module - اسم الوحدة (courses, videos, exams, ...)
 * @param {string} permission - نوع الصلاحية (can_view, can_create, can_edit, can_delete, can_publish, can_manage)
 * @returns {boolean}
 */
export const hasPermission = (permissions, module, permission) => {
  if (!permissions) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true; // الإدارة الكاملة تمنح جميع الصلاحيات
  return perm[permission] || false;
};

/**
 * الحصول على صلاحيات المساعد مع التخزين المؤقت (لتجنب جلبها كل مرة)
 */
let cachedPermissions = null;
let cachedUserId = null;

export const getCachedAssistantPermissions = async (userId) => {
  if (cachedUserId === userId && cachedPermissions !== null) {
    return cachedPermissions;
  }
  const perms = await getAssistantPermissions(userId);
  cachedUserId = userId;
  cachedPermissions = perms;
  return perms;
};