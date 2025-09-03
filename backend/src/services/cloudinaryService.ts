import { v2 as cloudinary } from 'cloudinary';
import logger from './logger';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export class CloudinaryService {
  private static instance: CloudinaryService;
  private isConfigured = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  private initialize(): void {
    try {
      const config: CloudinaryConfig = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
        api_key: process.env.CLOUDINARY_API_KEY || '',
        api_secret: process.env.CLOUDINARY_API_SECRET || ''
      };

      // Validate required configuration
      if (!config.cloud_name || !config.api_key || !config.api_secret) {
        logger.warn('Cloudinary configuration incomplete - some environment variables are missing');
        return;
      }

      // Configure Cloudinary
      cloudinary.config({
        cloud_name: config.cloud_name,
        api_key: config.api_key,
        api_secret: config.api_secret,
        secure: true
      });

      this.isConfigured = true;
      logger.info('Cloudinary service initialized successfully', {
        cloud_name: config.cloud_name,
        api_key: config.api_key.substring(0, 8) + '...' // Log partial key for debugging
      });
    } catch (error) {
      logger.error('Failed to initialize Cloudinary service', error);
    }
  }

  public isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload profile picture to Cloudinary with optimization
   */
  async uploadProfilePicture(
    fileBuffer: Buffer, 
    userId: string, 
    options: {
      format?: string;
      maxFileSize?: number;
    } = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary service is not properly configured');
    }

    const { maxFileSize = 5000000 } = options; // 5MB default

    // Validate file size
    if (fileBuffer.length > maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxFileSize / 1000000}MB`);
    }

    try {
      const timestamp = Date.now();
      const publicId = `worrybox/profile-pictures/user_${userId}_${timestamp}`;

      logger.info('Uploading profile picture to Cloudinary', {
        userId,
        publicId,
        fileSize: fileBuffer.length
      });

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: 'worrybox/profile-pictures',
            transformation: [
              {
                width: 200,
                height: 200,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto',
                format: 'auto'
              }
            ],
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            overwrite: true,
            invalidate: true
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload failed', error);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else if (result) {
              logger.info('Cloudinary upload successful', {
                public_id: result.public_id,
                secure_url: result.secure_url,
                bytes: result.bytes
              });
              resolve({
                public_id: result.public_id,
                secure_url: result.secure_url,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes
              });
            } else {
              reject(new Error('Cloudinary upload failed: No result returned'));
            }
          }
        ).end(fileBuffer);
      });

      return result;
    } catch (error: any) {
      logger.error('Profile picture upload failed', error);
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
  }

  /**
   * Delete profile picture from Cloudinary
   */
  async deleteProfilePicture(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary service is not properly configured');
    }

    if (!publicId) {
      throw new Error('Public ID is required for deletion');
    }

    try {
      logger.info('Deleting profile picture from Cloudinary', { publicId });

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        logger.info('Cloudinary deletion successful', { publicId });
      } else if (result.result === 'not found') {
        logger.warn('Cloudinary image not found for deletion', { publicId });
        // Don't throw error for not found - image might have been deleted already
      } else {
        logger.warn('Cloudinary deletion returned unexpected result', { 
          publicId, 
          result: result.result 
        });
      }
    } catch (error: any) {
      logger.error('Profile picture deletion failed', error);
      throw new Error(`Failed to delete profile picture: ${error.message}`);
    }
  }

  /**
   * Generate optimized URL for profile picture
   */
  generateProfilePictureUrl(
    publicId: string, 
    options: {
      width?: number;
      height?: number;
      quality?: string;
      format?: string;
    } = {}
  ): string {
    if (!this.isConfigured) {
      throw new Error('Cloudinary service is not properly configured');
    }

    const { width = 200, height = 200, quality = 'auto', format = 'auto' } = options;

    try {
      const url = cloudinary.url(publicId, {
        width,
        height,
        crop: 'fill',
        gravity: 'face',
        quality,
        format,
        secure: true
      });

      return url;
    } catch (error: any) {
      logger.error('Failed to generate Cloudinary URL', error);
      throw new Error(`Failed to generate profile picture URL: ${error.message}`);
    }
  }

  /**
   * Validate image file before upload
   */
  validateImageFile(
    fileBuffer: Buffer, 
    originalName: string,
    options: {
      maxSize?: number;
      allowedFormats?: string[];
    } = {}
  ): { isValid: boolean; error?: string } {
    const { 
      maxSize = 5000000, // 5MB
      allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    } = options;

    // Check file size
    if (fileBuffer.length > maxSize) {
      return {
        isValid: false,
        error: `File size (${Math.round(fileBuffer.length / 1000000 * 100) / 100}MB) exceeds maximum allowed size of ${maxSize / 1000000}MB`
      };
    }

    // Check file extension
    const extension = originalName.toLowerCase().split('.').pop();
    if (!extension || !allowedFormats.includes(extension)) {
      return {
        isValid: false,
        error: `File format '${extension}' is not allowed. Allowed formats: ${allowedFormats.join(', ')}`
      };
    }

    // Basic file signature validation (magic numbers)
    const signatures = {
      jpg: [0xFF, 0xD8, 0xFF],
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      webp: [0x52, 0x49, 0x46, 0x46], // RIFF header
      gif: [0x47, 0x49, 0x46]
    };

    if (extension && signatures[extension as keyof typeof signatures]) {
      const signature = signatures[extension as keyof typeof signatures];
      const fileSignature = Array.from(fileBuffer.slice(0, signature.length));
      
      if (extension === 'webp') {
        // WebP has RIFF header followed by WEBP
        const webpSignature = Array.from(fileBuffer.slice(8, 12));
        const expectedWebp = [0x57, 0x45, 0x42, 0x50]; // WEBP
        if (!signature.every((byte, i) => byte === fileSignature[i]) ||
            !expectedWebp.every((byte, i) => byte === webpSignature[i])) {
          return {
            isValid: false,
            error: 'File content does not match the file extension'
          };
        }
      } else {
        if (!signature.every((byte, i) => byte === fileSignature[i])) {
          return {
            isValid: false,
            error: 'File content does not match the file extension'
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Get Cloudinary configuration status
   */
  getConfigurationStatus(): {
    isConfigured: boolean;
    cloudName?: string;
    hasApiKey: boolean;
    hasApiSecret: boolean;
  } {
    return {
      isConfigured: this.isConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    };
  }
}