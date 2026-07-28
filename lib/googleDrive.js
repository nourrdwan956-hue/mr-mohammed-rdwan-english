


import { google } from 'googleapis';

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const auth = new google.auth.JWT({
  email: GOOGLE_CLIENT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadToGoogleDrive(fileBuffer, fileName, mimeType) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: fileBuffer,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink || `https://drive.google.com/uc?export=download&id=${response.data.id}`,
    };
  } catch (error) {
    console.error('❌ Google Drive upload error:', error);
    throw new Error('فشل رفع الملف إلى Google Drive: ' + error.message);
  }
}

export async function deleteFromGoogleDrive(fileId) {
  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error('❌ Google Drive delete error:', error);
    return false;
  }
}