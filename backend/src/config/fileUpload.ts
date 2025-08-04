/**
 * File Upload Configuration for Render.com Deployment
 * 
 * For MVP: Using local file storage
 * For production: Can be upgraded to cloud storage (AWS S3, Cloudinary, etc.)
 */

import path from 'path';
import fs from 'fs';

// File upload configuration
export const FILE_UPLOAD_CONFIG = {
  // Maximum file size (5MB)
  maxFileSize: 5 * 1024 * 1024,
  
  // Allowed file types for avatars
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ],
  
  // Upload directory (relative to backend root)
  uploadDir: process.env.NODE_ENV === 'production' 
    ? '/tmp/uploads' // Render.com temporary storage
    : path.join(process.cwd(), 'uploads'),
    
  // Public URL base for serving files
  publicUrlBase: process.env.NODE_ENV === 'production'
    ? process.env.BACKEND_URL || 'https://worrybox-backend.onrender.com'
    : 'http://localhost:5000',
};

// Ensure upload directory exists
export function ensureUploadDirectory() {
  const uploadDir = FILE_UPLOAD_CONFIG.uploadDir;
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Created upload directory: ${uploadDir}`);
  }
}

// Generate unique filename
export function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = path.extname(originalName);
  
  return `${timestamp}-${random}${extension}`;
}

// Validate file type
export function isValidFileType(mimeType: string): boolean {
  return FILE_UPLOAD_CONFIG.allowedMimeTypes.includes(mimeType);
}

// Get file URL for serving
export function getFileUrl(filename: string): string {
  return `${FILE_UPLOAD_CONFIG.publicUrlBase}/uploads/${filename}`;
}

// Clean up old files (for temporary storage)
export function cleanupOldFiles(maxAgeHours: number = 24) {
  const uploadDir = FILE_UPLOAD_CONFIG.uploadDir;
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
  
  try {
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up old file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}

// Note for production upgrade:
export const PRODUCTION_UPGRADE_NOTES = `
For production deployment, consider upgrading to cloud storage:

1. AWS S3 with CloudFront CDN
2. Cloudinary for image optimization
3. Google Cloud Storage
4. Azure Blob Storage

Benefits:
- Persistent storage (Render.com has ephemeral filesystem)
- Better performance with CDN
- Image optimization and resizing
- Better scalability
`;