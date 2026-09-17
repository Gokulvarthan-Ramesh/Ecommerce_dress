import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import { ApiResponse } from '../utils/response';
import { Request, Response, NextFunction } from 'express';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationService.getByUserId(req.user!.id);
    const unreadCount = await NotificationService.getUnreadCount(req.user!.id);
    ApiResponse.success(res, { notifications, unreadCount });
  } catch (error) { next(error); }
});

router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAsRead(req.user!.id, req.params.id);
    ApiResponse.success(res, null, 'Notification marked as read');
  } catch (error) { next(error); }
});

router.patch('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAllAsRead(req.user!.id);
    ApiResponse.success(res, null, 'All notifications marked as read');
  } catch (error) { next(error); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.deleteNotification(req.user!.id, req.params.id);
    ApiResponse.success(res, null, 'Notification deleted successfully');
  } catch (error) { next(error); }
});

router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.deleteAllNotifications(req.user!.id);
    ApiResponse.success(res, null, 'All notifications cleared successfully');
  } catch (error) { next(error); }
});

export default router;

