import { Request, Response, NextFunction } from 'express';
import { VendorApplicationService } from '../services/vendorApplicationService';

export class VendorApplicationController {
  // ==========================================
  // 1. VENDOR SELF-SERVICE ENDPOINTS
  // ==========================================

  /**
   * POST /vendor/application
   * Create a new vendor application (DRAFT)
   */
  static async createApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const application = await VendorApplicationService.createApplication(vendorUserId, req.body);
      res.status(201).json({
        success: true,
        message: 'Vendor application created as DRAFT. Complete all sections and submit for review.',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vendor/application
   */
  static async getMyApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const application = await VendorApplicationService.getMyApplication(vendorUserId);
      res.status(200).json({
        success: true,
        message: 'Vendor application retrieved',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /vendor/application
   */
  static async updateApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const application = await VendorApplicationService.updateApplication(vendorUserId, req.body);
      res.status(200).json({
        success: true,
        message: 'Vendor application updated',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendor/application/submit
   */
  static async submitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const result = await VendorApplicationService.submitApplication(vendorUserId);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.application,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 2. DOCUMENT MANAGEMENT ENDPOINTS
  // ==========================================

  static async addDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const document = await VendorApplicationService.addDocument(vendorUserId, req.body);
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const documents = await VendorApplicationService.getMyDocuments(vendorUserId);
      res.status(200).json({
        success: true,
        message: 'Documents retrieved',
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const result = await VendorApplicationService.deleteDocument(vendorUserId, req.params.id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 3. BANK ACCOUNT ENDPOINTS
  // ==========================================

  static async upsertBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const bankAccount = await VendorApplicationService.upsertBankAccount(vendorUserId, req.body);
      res.status(200).json({
        success: true,
        message: 'Bank account details saved',
        data: bankAccount,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const bankAccount = await VendorApplicationService.getMyBankAccount(vendorUserId);
      res.status(200).json({
        success: true,
        message: 'Bank account details retrieved',
        data: bankAccount,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 4. PICKUP ADDRESS ENDPOINTS
  // ==========================================

  static async upsertPickupAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const address = await VendorApplicationService.upsertPickupAddress(vendorUserId, req.body);
      res.status(200).json({
        success: true,
        message: 'Pickup address saved',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyPickupAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendorUserId = req.vendorUser!.id;
      const address = await VendorApplicationService.getMyPickupAddress(vendorUserId);
      res.status(200).json({
        success: true,
        message: 'Pickup address retrieved',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 5. ADMIN ENDPOINTS (use req.user from admin auth)
  // ==========================================

  static async adminListApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await VendorApplicationService.adminListApplications(req.query);
      res.status(200).json({
        success: true,
        message: 'Vendor applications retrieved',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminGetApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await VendorApplicationService.adminGetApplication(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Vendor application details retrieved',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminStartReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const updated = await VendorApplicationService.adminStartReview(req.params.id, adminId);
      res.status(200).json({
        success: true,
        message: 'Application moved to UNDER_REVIEW',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminRequestChanges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { remarks } = req.body;
      const updated = await VendorApplicationService.adminRequestChanges(req.params.id, adminId, remarks);
      res.status(200).json({
        success: true,
        message: 'Changes requested from vendor',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminApproveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { remarks } = req.body;
      const result = await VendorApplicationService.adminApproveApplication(req.params.id, adminId, remarks);
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          application: result.application,
          shop: result.shop,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminRejectApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { remarks } = req.body;
      const updated = await VendorApplicationService.adminRejectApplication(req.params.id, adminId, remarks);
      res.status(200).json({
        success: true,
        message: 'Application rejected',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 6. ADMIN: VERIFICATION ENDPOINTS
  // ==========================================

  static async adminVerifyDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const updated = await VendorApplicationService.adminVerifyDocument(req.params.id, adminId, req.body);
      res.status(200).json({
        success: true,
        message: `Document ${updated.status.toLowerCase()}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminVerifyBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const updated = await VendorApplicationService.adminVerifyBankAccount(req.params.id, adminId, req.body);
      res.status(200).json({
        success: true,
        message: `Bank account ${updated.status.toLowerCase().replace('_', ' ')}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminVerifyPickupAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const updated = await VendorApplicationService.adminVerifyPickupAddress(req.params.id, adminId, req.body);
      res.status(200).json({
        success: true,
        message: `Pickup address ${updated.status.toLowerCase()}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 7. ADMIN: AUDIT LOG ENDPOINT
  // ==========================================

  static async adminGetAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await VendorApplicationService.getApplicationAuditLog(req.params.id, req.query);
      res.status(200).json({
        success: true,
        message: 'Audit log retrieved',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
