import { Request, Response } from 'express';
import { FollowService } from '../services/followService';

const followService = new FollowService();

export class FollowController {
  async toggleFollow(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const followerId = req.user.userId;
      const { userId: followingId } = req.params;

      if (!followingId) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Target user ID is required' },
        });
      }

      const result = await followService.toggleFollow(followerId, followingId);

      res.json({
        message: result.isFollowing ? 'Successfully followed user' : 'Successfully unfollowed user',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'TOGGLE_FOLLOW_FAILED',
          message: error.message || 'Failed to update follow status',
        },
      });
    }
  }

  // Note: The other controller methods (followUser, unfollowUser) would be here.
  // I am only creating the toggle method as requested for now.
}
