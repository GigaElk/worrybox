import { Request, Response } from 'express';
import multer from 'multer';


import { ProfilePictureService } from '../services/profilePictureService';
import logger from '../services/logger';

const profilePictureService = new ProfilePictureService();

// Configure multer for memory storage (temporary processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  }
});

export const uploadMiddleware = upload.single('profilePicture');

export class ProfilePictureController {
  async uploadProfilePicture(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No profile picture file was uploaded',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { buffer, originalname } = req.file;
      const userId = req.user.userId;

      // Additional validation using the service
      const validation = profilePictureService.validateProfilePictureFile(buffer, originalname);
      if (!validation.isValid) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FILE',
            message: validation.error || 'Invalid profile picture file',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      logger.info('Processing profile picture upload', {
        userId,
        fileName: originalname,
        fileSize: buffer.length,
        mimeType: req.file.mimetype
      });

      // Upload to Cloudinary and update database
      const result = await profilePictureService.uploadProfilePicture(
        userId,
        buffer,
        originalname
      );

      res.status(201).json({
        message: 'Profile picture uploaded successfully',
        data: result,
      });

    } catch (error: any) {
      logger.error('Profile picture upload failed', {
        userId: req.user?.userId,
        error: error.message,
        stack: error.stack
      });

      if (error.message.includes('not available') || error.message.includes('configuration')) {
        return res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Profile picture service is temporarily unavailable',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (error.message.includes('File size') || error.message.includes('format')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FILE',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (error.message === 'User not found') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload profile picture',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async deleteProfilePicture(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const userId = req.user.userId;

      logger.info('Processing profile picture deletion', { userId });

      await profilePictureService.deleteProfilePicture(userId);

      res.json({
        message: 'Profile picture deleted successfully',
      });

    } catch (error: any) {
      logger.error('Profile picture deletion failed', {
        userId: req.user?.userId,
        error: error.message
      });

      if (error.message === 'User not found') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (error.message === 'User does not have a profile picture') {
        return res.status(400).json({
          error: {
            code: 'NO_PROFILE_PICTURE',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete profile picture',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getProfilePicture(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const profilePicture = await profilePictureService.getProfilePicture(userId);

      res.json({
        data: profilePicture,
      });

    } catch (error: any) {
      logger.error('Failed to get profile picture', {
        userId: req.params.userId,
        error: error.message
      });

      if (error.message === 'User not found') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'GET_PROFILE_PICTURE_FAILED',
          message: 'Failed to get profile picture',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getServiceStatus(req: Request, res: Response) {
    try {
      const status = profilePictureService.getServiceStatus();

      res.json({
        data: status,
      });

    } catch (error: any) {
      logger.error('Failed to get profile picture service status', error);

      res.status(500).json({
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: 'Failed to check service status',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}