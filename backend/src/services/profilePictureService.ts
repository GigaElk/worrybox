import { PrismaClient } from '@prisma/client';
import { CloudinaryService, CloudinaryUploadResult } from './cloudinaryService';
import logger from './logger';

const prisma = new PrismaClient();

export interface ProfilePictureResponse {
  profilePictureUrl: string | null;
  profilePictureCloudinaryId: string | null;
  updatedAt: string | null;
}

export interface ProfilePictureUploadResult {
  profilePictureUrl: string;
  profilePictureCloudinaryId: string;
  updatedAt: string;
}

export class ProfilePictureService {
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.cloudinaryService = CloudinaryService.getInstance();
  }

  /**
   * Upload and set user's profile picture
   */
  async uploadProfilePicture(
    userId: string,
    fileBuffer: Buffer,
    originalName: string
  ): Promise<ProfilePictureUploadResult> {
    // Validate Cloudinary service availability
    if (!this.cloudinaryService.isAvailable()) {
      throw new Error('Profile picture service is not available. Please check Cloudinary configuration.');
    }

    // Validate the image file
    const validation = this.cloudinaryService.validateImageFile(fileBuffer, originalName);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid image file');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        profilePictureUpdatedAt: true,
        profilePictureCloudinaryId: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    try {
      // Get current profile picture info for cleanup
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          avatarUrl: true,
          profilePictureCloudinaryId: true
        }
      });

      // Upload new image to Cloudinary
      logger.info('Uploading profile picture for user', { userId, fileName: originalName });
      
      const uploadResult: CloudinaryUploadResult = await this.cloudinaryService.uploadProfilePicture(
        fileBuffer,
        userId,
        {
          maxFileSize: 5000000 // 5MB
        }
      );

      // Update user record with new profile picture info
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: uploadResult.secure_url,
          profilePictureCloudinaryId: uploadResult.public_id,
          profilePictureUpdatedAt: new Date()
        }
      });

      // Clean up old Cloudinary image if it exists
      if (currentUser?.profilePictureCloudinaryId || currentUser?.avatarUrl) {
        try {
          // Use stored Cloudinary ID if available, otherwise extract from URL
          const oldPublicId = currentUser.profilePictureCloudinaryId || 
                             this.extractPublicIdFromUrl(currentUser.avatarUrl || '');
          
          if (oldPublicId) {
            await this.cloudinaryService.deleteProfilePicture(oldPublicId);
            logger.info('Cleaned up old profile picture', { userId, oldPublicId });
          }
        } catch (cleanupError) {
          // Log but don't fail the upload if cleanup fails
          logger.warn('Failed to cleanup old profile picture', { 
            userId, 
            error: cleanupError 
          });
        }
      }

      logger.info('Profile picture upload completed successfully', {
        userId,
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url
      });

      return {
        profilePictureUrl: uploadResult.secure_url,
        profilePictureCloudinaryId: uploadResult.public_id,
        updatedAt: updatedUser.profilePictureUpdatedAt?.toISOString() || new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Profile picture upload failed', { userId, error: error.message });
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
  }

  /**
   * Delete user's profile picture
   */
  async deleteProfilePicture(userId: string): Promise<void> {
    // Check if user exists and has a profile picture
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        avatarUrl: true,
        // profilePictureCloudinaryId: true // Will be added to schema
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.avatarUrl) {
      throw new Error('User does not have a profile picture');
    }

    try {
      // Extract public_id from Cloudinary URL
      const publicId = this.extractPublicIdFromUrl(user.avatarUrl);
      
      if (publicId && this.cloudinaryService.isAvailable()) {
        // Delete from Cloudinary
        await this.cloudinaryService.deleteProfilePicture(publicId);
        logger.info('Deleted profile picture from Cloudinary', { userId, publicId });
      }

      // Update user record to remove profile picture
      await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: null,
          profilePictureUpdatedAt: new Date()
          // profilePictureCloudinaryId: null // Will be added to schema
        }
      });

      logger.info('Profile picture deletion completed successfully', { userId });

    } catch (error: any) {
      logger.error('Profile picture deletion failed', { userId, error: error.message });
      throw new Error(`Failed to delete profile picture: ${error.message}`);
    }
  }

  /**
   * Get user's profile picture information
   */
  async getProfilePicture(userId: string): Promise<ProfilePictureResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        avatarUrl: true,
        profilePictureUpdatedAt: true
        // profilePictureCloudinaryId: true // Will be added to schema
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      profilePictureUrl: user.avatarUrl,
      profilePictureCloudinaryId: user.avatarUrl ? this.extractPublicIdFromUrl(user.avatarUrl) : null,
      updatedAt: user.profilePictureUpdatedAt?.toISOString() || null
    };
  }

  /**
   * Generate optimized profile picture URL
   */
  generateOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: string;
    } = {}
  ): string {
    if (!this.cloudinaryService.isAvailable()) {
      throw new Error('Profile picture service is not available');
    }

    return this.cloudinaryService.generateProfilePictureUrl(publicId, options);
  }

  /**
   * Extract Cloudinary public_id from URL
   * Handles Cloudinary URLs in format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Check if it's a Cloudinary URL
      if (!url.includes('cloudinary.com')) {
        return null;
      }

      // Extract public_id from Cloudinary URL
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      
      if (uploadIndex === -1 || uploadIndex + 2 >= urlParts.length) {
        return null;
      }

      // Get everything after /upload/v{version}/ or /upload/
      let pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
      
      // Remove version if present (starts with v followed by numbers)
      if (pathAfterUpload.match(/^v\d+\//)) {
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
      }

      // Remove file extension
      const publicId = pathAfterUpload.replace(/\.[^.]+$/, '');
      
      return publicId || null;
    } catch (error) {
      logger.warn('Failed to extract public_id from URL', { url, error });
      return null;
    }
  }

  /**
   * Validate profile picture file
   */
  validateProfilePictureFile(
    fileBuffer: Buffer,
    originalName: string
  ): { isValid: boolean; error?: string } {
    return this.cloudinaryService.validateImageFile(fileBuffer, originalName, {
      maxSize: 5000000, // 5MB
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
    });
  }

  /**
   * Get service status and configuration
   */
  getServiceStatus(): {
    isAvailable: boolean;
    cloudinaryStatus: any;
  } {
    return {
      isAvailable: this.cloudinaryService.isAvailable(),
      cloudinaryStatus: this.cloudinaryService.getConfigurationStatus()
    };
  }
}