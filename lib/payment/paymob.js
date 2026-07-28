

// ================================================================
// 💳 lib/payment/paymob.js
// نظام الدفع عبر Paymob – متكامل مع Next.js 16 + Supabase
// يعمل في بيئة الخادم (Server) فقط، ولا يعتمد على window أو localStorage
// جميع الدوال تستقبل supabaseClient كمعامل (حقن تبعية)
// ================================================================

import { createHmac } from 'crypto';

// ================================================================
// 1. قراءة متغيرات البيئة مع التحقق من وجودها
// ================================================================

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET;
const PAYMOB_BASE_URL = process.env.PAYMOB_BASE_URL || 'https://accept.paymob.com/api';

// التحقق من المتغيرات الأساسية (سيتم تنبيه المطور في حالة النقص)
function validateEnvVariables() {
  const required = [
    { key: 'PAYMOB_API_KEY', value: PAYMOB_API_KEY },
    { key: 'PAYMOB_INTEGRATION_ID', value: PAYMOB_INTEGRATION_ID },
    { key: 'PAYMOB_IFRAME_ID', value: PAYMOB_IFRAME_ID },
    { key: 'PAYMOB_HMAC_SECRET', value: PAYMOB_HMAC_SECRET },
  ];
  const missing = required.filter(({ key, value }) => !value);
  if (missing.length > 0) {
    console.warn(
      `⚠️ Paymob: Missing environment variables: ${missing.map(({ key }) => key).join(', ')}`
    );
  }
  return missing.length === 0;
}

// ================================================================
// 2. دوال مساعدة داخلية (غير مصدرة)
// ================================================================

/**
 * توليد توقيع HMAC-SHA512 باستخدام crypto من Node.js
 * @param {Object} payload - البيانات المرسلة من Paymob
 * @param {string} secret - المفتاح السري (PAYMOB_HMAC_SECRET)
 * @returns {string} التوقيع بصيغة سداسية عشرية
 */
function generateHmacSignature(payload, secret = PAYMOB_HMAC_SECRET) {
  if (!secret) {
    throw new Error('HMAC secret is missing');
  }
  // ترتيب المفاتيح أبجدياً وتجميع القيم في سلسلة واحدة (بدون فواصل)
  const sortedKeys = Object.keys(payload).sort();
  const concatenated = sortedKeys.map((key) => String(payload[key] ?? '')).join('');
  
  // استخدام createHmac من crypto (يعمل في بيئة Node.js فقط)
  const hmac = createHmac('sha512', secret);
  hmac.update(concatenated, 'utf8');
  return hmac.digest('hex');
}

/**
 * التحقق من صحة التوقيع المستلم من Paymob
 * @param {string} receivedSignature - التوقيع المرسل في الـ Header
 * @param {Object} payload - بيانات الـ Webhook
 * @param {string} secret - المفتاح السري (اختياري)
 * @returns {boolean}
 */
function verifySignature(receivedSignature, payload, secret = PAYMOB_HMAC_SECRET) {
  if (!receivedSignature) return false;
  try {
    const generated = generateHmacSignature(payload, secret);
    return generated === receivedSignature;
  } catch (error) {
    console.error('❌ Signature verification error:', error.message);
    return false;
  }
}

/**
 * إجراء طلب إلى Paymob مع معالجة الأخطاء الموحدة
 * @param {string} endpoint - نقطة النهاية (مثل '/auth/tokens')
 * @param {Object} options - خيارات fetch (method, body, headers)
 * @returns {Promise<Object>}
 */
async function requestPaymob(endpoint, options = {}) {
  const url = `${PAYMOB_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Paymob API error (${response.status}):`, errorText);
    throw new Error(`Paymob request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ================================================================
// 3. الدوال الأساسية المصدرة (للاستخدام في API Routes)
// ================================================================

/**
 * المصادقة مع Paymob والحصول على Token
 * @param {string} apiKey - مفتاح API (يؤخذ من المتغيرات البيئية)
 * @returns {Promise<string>} Token المصادقة
 */
async function authenticatePaymob(apiKey = PAYMOB_API_KEY) {
  if (!apiKey) throw new Error('PAYMOB_API_KEY is missing');
  
  try {
    const data = await requestPaymob('/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    });
    
    if (!data.token) {
      throw new Error('No token received from Paymob');
    }
    
    return data.token;
  } catch (error) {
    console.error('❌ Paymob authentication error:', error.message);
    throw new Error(`Failed to authenticate with Paymob: ${error.message}`);
  }
}

/**
 * إنشاء طلب (Order) في Paymob
 * @param {string} token - Token المصادقة
 * @param {number} amountCents - المبلغ بالسنت (مثال: 10000 = 100 ج.م)
 * @param {string} courseTitle - عنوان الكورس
 * @returns {Promise<{ orderId: string }>}
 */
async function createOrder(token, amountCents, courseTitle) {
  try {
    const data = await requestPaymob('/ecommerce/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        items: [
          {
            name: courseTitle || 'Course Subscription',
            amount_cents: amountCents,
            description: `اشتراك في كورس ${courseTitle || ''}`,
            quantity: 1,
          },
        ],
      }),
    });

    if (!data.id) {
      throw new Error('Order creation failed: no order ID returned');
    }

    return { orderId: data.id.toString() };
  } catch (error) {
    console.error('❌ Order creation error:', error.message);
    throw new Error(`Order creation failed: ${error.message}`);
  }
}

/**
 * الحصول على Payment Key (رابط الدفع)
 * @param {string} token - Token المصادقة
 * @param {string} orderId - معرف الطلب
 * @param {number} amountCents - المبلغ بالسنت
 * @param {string} integrationId - معرف التكامل (من المتغيرات البيئية)
 * @param {Object} billingData - بيانات الفاتورة (يمكن إرسال بيانات افتراضية)
 * @returns {Promise<{ paymentKey: string }>}
 */
async function getPaymentKey(
  token,
  orderId,
  amountCents,
  integrationId = PAYMOB_INTEGRATION_ID,
  billingData = {}
) {
  if (!integrationId) throw new Error('PAYMOB_INTEGRATION_ID is missing');

  try {
    const data = await requestPaymob('/acceptance/payment_keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amountCents,
        expiration: 3600, // صلاحية ساعة واحدة
        order_id: orderId,
        billing_data: {
          apartment: 'NA',
          email: 'NA',
          floor: 'NA',
          first_name: 'Student',
          street: 'NA',
          building: 'NA',
          phone_number: 'NA',
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'NA',
          country: 'NA',
          last_name: 'Student',
          state: 'NA',
          ...billingData, // يمكن تخصيصها من الخارج
        },
        currency: 'EGP',
        integration_id: integrationId,
        lock_order_when_paid: false,
      }),
    });

    if (!data.token) {
      throw new Error('No payment key received');
    }

    return { paymentKey: data.token };
  } catch (error) {
    console.error('❌ Payment key generation error:', error.message);
    throw new Error(`Payment key generation failed: ${error.message}`);
  }
}

/**
 * دالة شاملة لإنشاء طلب دفع كامل (التدفق الكامل)
 * @param {SupabaseClient} supabaseClient - عميل Supabase (للخادم)
 * @param {string} studentId - معرف الطالب
 * @param {string} courseId - معرف الكورس
 * @param {number} amount - المبلغ بالجنيه المصري (سيتم تحويله إلى سنت)
 * @param {string} courseTitle - عنوان الكورس
 * @param {Object} options - خيارات إضافية (billingData, redirectUrl)
 * @returns {Promise<{ success: boolean, paymentUrl?: string, orderId?: string, intentId?: string, error?: string }>}
 */
export async function createPaymentIntent(
  supabaseClient,
  studentId,
  courseId,
  amount,
  courseTitle,
  options = {}
) {
  // التحقق من المتغيرات البيئية
  if (!validateEnvVariables()) {
    return {
      success: false,
      error: 'Paymob configuration is incomplete. Check environment variables.',
    };
  }

  try {
    // 1. المصادقة
    const token = await authenticatePaymob();

    // 2. تحويل المبلغ إلى سنت
    const amountCents = Math.round(amount * 100);

    // 3. إنشاء الطلب
    const { orderId } = await createOrder(token, amountCents, courseTitle);

    // 4. الحصول على Payment Key
    const { paymentKey } = await getPaymentKey(
      token,
      orderId,
      amountCents,
      PAYMOB_INTEGRATION_ID,
      options.billingData || {}
    );

    // 5. تخزين payment_intent في قاعدة البيانات (باستخدام العميل المُمرر)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة
    const { data: intent, error: dbError } = await supabaseClient
      .from('payment_intents')
      .insert({
        student_id: studentId,
        course_id: courseId,
        amount: amountCents,
        paymob_order_id: orderId,
        paymob_payment_key: paymentKey,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        metadata: options.metadata || {},
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('❌ Database insert error (payment_intent):', dbError.message);
      // لا نتعامل مع هذا كخطأ قاتل، لأن paymentKey تم إنشاؤه بالفعل
      // لكن نسجل الخطأ للمتابعة
    }

    // 6. إنشاء رابط الدفع النهائي
    const paymentUrl =
      `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    return {
      success: true,
      paymentUrl,
      orderId,
      intentId: intent?.id || null,
    };
  } catch (error) {
    console.error('❌ createPaymentIntent error:', error.message);
    return {
      success: false,
      error: error.message || 'فشل إنشاء طلب الدفع',
    };
  }
}

/**
 * معالجة Webhook من Paymob (تأكيد الدفع)
 * @param {SupabaseClient} supabaseClient - عميل Supabase (يفضل استخدام Admin Client لتجاوز RLS)
 * @param {Object} payload - البيانات المستلمة من Paymob
 * @param {string} signature - التوقيع المرسل في الـ Header (x-paymob-signature أو hmac)
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function handleWebhook(supabaseClient, payload, signature = null) {
  try {
    // 1. التحقق من صحة التوقيع (إذا كان متاحاً)
    if (signature) {
      const isValid = verifySignature(signature, payload, PAYMOB_HMAC_SECRET);
      if (!isValid) {
        console.error('❌ Webhook: Invalid HMAC signature');
        return { success: false, error: 'Invalid signature' };
      }
      console.log('✅ Webhook: Signature verified successfully');
    } else {
      console.warn('⚠️ Webhook: No signature provided, skipping verification (test mode)');
    }

    // 2. استخراج البيانات الأساسية من الـ payload
    const { order_id, transaction_id, success, amount_cents, obj } = payload;

    if (!order_id) {
      console.error('❌ Webhook: Missing order_id');
      return { success: false, error: 'Missing order_id' };
    }

    // 3. جلب payment_intent من قاعدة البيانات
    const { data: intent, error: intentError } = await supabaseClient
      .from('payment_intents')
      .select('*')
      .eq('paymob_order_id', order_id)
      .single();

    if (intentError || !intent) {
      console.error('❌ Webhook: Payment intent not found for order_id:', order_id);
      return { success: false, error: 'Payment intent not found' };
    }

    // 4. إذا كان الدفع ناجحاً
    const isSuccess = success === true || success === 'true' || success === 1;

    if (isSuccess) {
      // تحديث حالة payment_intent إلى 'paid'
      await supabaseClient
        .from('payment_intents')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', intent.id);

      // 5. جلب معلومات الكورس للتحقق من أنه غير مجاني
      const { data: course, error: courseError } = await supabaseClient
        .from('courses')
        .select('id, is_free, price, title, teacher_id')
        .eq('id', intent.course_id)
        .single();

      if (courseError || !course) {
        console.error('❌ Webhook: Course not found for course_id:', intent.course_id);
        return { success: false, error: 'Course not found' };
      }

      // 6. التحقق من وجود اشتراك سابق (لتجنب التكرار)
      const { data: existingSub, error: subCheckError } = await supabaseClient
        .from('course_subscriptions')
        .select('id')
        .eq('student_id', intent.student_id)
        .eq('course_id', intent.course_id)
        .maybeSingle();

      if (!existingSub) {
        // إنشاء اشتراك جديد (paid, max_devices=2)
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 يوم
        const { error: insertSubError } = await supabaseClient
          .from('course_subscriptions')
          .insert({
            student_id: intent.student_id,
            course_id: intent.course_id,
            access_type: 'paid',
            max_devices: 2,
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
          });

        if (insertSubError) {
          console.error('❌ Webhook: Error creating subscription:', insertSubError.message);
          // لا نوقف التنفيذ هنا، بل نستمر لتسجيل الدفع
        } else {
          console.log('✅ Webhook: Subscription created for student', intent.student_id);
        }
      } else {
        console.log('ℹ️ Webhook: Subscription already exists for student', intent.student_id);
      }

      // 7. تسجيل الدفع في جدول course_payments
      const { error: paymentInsertError } = await supabaseClient
        .from('course_payments')
        .insert({
          student_id: intent.student_id,
          course_id: intent.course_id,
          amount: intent.amount || amount_cents,
          payment_method: 'paymob',
          transaction_id: transaction_id || 'N/A',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          metadata: payload,
        });

      if (paymentInsertError) {
        console.error('❌ Webhook: Error recording payment:', paymentInsertError.message);
        // الخطأ هنا ليس قاتلاً، لكن نسجله للمتابعة
      }

      // 8. (اختياري) إرسال إشعار للمعلم – يمكنك إضافة وظيفة منفصلة هنا

      return {
        success: true,
        message: 'Payment processed and subscription activated successfully',
      };
    } else {
      // الدفع فاشل
      await supabaseClient
        .from('payment_intents')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', intent.id);

      return {
        success: false,
        message: 'Payment failed',
      };
    }
  } catch (error) {
    console.error('❌ Webhook handler error:', error.message);
    return {
      success: false,
      error: `Webhook processing error: ${error.message}`,
    };
  }
}

/**
 * التحقق من حالة الدفع يدوياً (اختياري)
 * @param {string} orderId - معرف الطلب من Paymob
 * @param {string} apiKey - مفتاح API (اختياري)
 * @returns {Promise<{ success: boolean, status?: string, data?: Object }>}
 */
export async function checkPaymentStatus(orderId, apiKey = PAYMOB_API_KEY) {
  try {
    if (!apiKey) throw new Error('PAYMOB_API_KEY is missing');

    // مصادقة
    const token = await authenticatePaymob(apiKey);

    // جلب حالة الطلب
    const data = await requestPaymob(`/ecommerce/orders/${orderId}/payment-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const isPaid = data.paid === true || data.status === 'paid';

    return {
      success: true,
      status: isPaid ? 'paid' : 'pending',
      data,
    };
  } catch (error) {
    console.error('❌ Payment status check error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ================================================================
// 4. تصدير الواجهة العامة
// ================================================================

export default {
  createPaymentIntent,
  handleWebhook,
  checkPaymentStatus,
  authenticatePaymob,
  verifySignature,
  generateHmacSignature,
};