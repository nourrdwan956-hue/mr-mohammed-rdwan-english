// lib/telegram.js
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// نستخدم polling: false لأننا سنستدعي الـ bot مباشرة من API Routes
const bot = new TelegramBot(token, { polling: false });

/**
 * رفع فيديو إلى تليجرام وإرجاع file_id
 * @param {Buffer} videoBuffer - محتوى الفيديو
 * @param {string} caption - عنوان الفيديو
 * @returns {Promise<string>} - file_id
 */
export async function uploadVideoToTelegram(videoBuffer, caption = '') {
  try {
    const result = await bot.sendVideo(chatId, videoBuffer, {
      caption: caption,
      supports_streaming: true,
    });
    return result.video.file_id;
  } catch (error) {
    console.error('Telegram upload error:', error);
    throw new Error('فشل رفع الفيديو إلى تليجرام');
  }
}

/**
 * الحصول على رابط تشغيل الفيديو من file_id
 * @param {string} fileId
 * @returns {Promise<string>} - رابط مباشر للتشغيل
 */
export async function getVideoUrl(fileId) {
  try {
    const file = await bot.getFile(fileId);
    const filePath = file.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    return fileUrl;
  } catch (error) {
    console.error('Telegram get file error:', error);
    throw new Error('فشل جلب رابط الفيديو');
  }
}