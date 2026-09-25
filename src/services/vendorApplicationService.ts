import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  VendorApplicationStatus,
  DocumentStatus,
  BankAccountStatus,
  PickupAddressStatus,
  ShopStatus,
} from '@prisma/client';

export class VendorApplicationService {
  // ==========================================
  // 1. VENDOR SELF-SERVICE (Application CRUD)
  // ==========================================

  /**
   * Create a new vendor application (DRAFT)
   */
  static async createApplication(vendorUserId: string, data: any) {
    // Check if vendor already has an application
    const existing = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
    });

    if (existing) {
      throw new AppError(
        `You already have an application (ID: ${existing.id}, Status: ${existing.status}). ` +
        `Use the update endpoint instead.`,
        409
      );
    }

    const {
      ownerName,
      shopName,
      businessEmail,
      businessPhone,
      description,
      shopLogoUrl,
      shopBannerUrl,
      shopCategoryId,
      businessType,
      gstin,
      panNumber,
    } = data;

    if (!ownerName || !shopName) {
      throw new AppError('ownerName and shopName are required');
    }

    const application = await prisma.vendorApplication.create({
      data: {
        vendorUserId,
        ownerName: ownerName.trim(),
        shopName: shopName.trim(),
        businessEmail: businessEmail || null,
        businessPhone: businessPhone || null,
        description: description || null,
        shopLogoUrl: shopLogoUrl || null,
        shopBannerUrl: shopBannerUrl || null,
        shopCategoryId: shopCategoryId || null,
        businessType: businessType || null,
        gstin: gstin || null,
        panNumber: panNumber || null,
        status: VendorApplicationStatus.DRAFT,
      },
      include: {
        documents: true,
        bankAccount: true,
        pickupAddress: true,
      },
    });

    // Audit log
    await this.createAuditLog({
      applicationId: application.id,
      vendorPerformer: vendorUserId,
      action: 'CREATE',
      entity: 'VendorApplication',
      entityId: application.id,
      newValue: { ownerName, shopName, status: 'DRAFT' },
    });

    return application;
  }

  /**
   * Get the current vendor's application with all related data
   */
  static async getMyApplication(vendorUserId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        bankAccount: true,
        pickupAddress: true,
        shop: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    if (!application) {
      throw new AppError('No vendor application found. Please create one first.', 404);
    }

    // Calculate completion percentage
    const completionStatus = this.calculateCompletionStatus(application);

    return {
      ...application,
      completionStatus,
    };
  }

  /**
   * Update the vendor application (only allowed when DRAFT or CHANGES_REQUESTED)
   */
  static async updateApplication(vendorUserId: string, data: any) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    const editableStatuses: VendorApplicationStatus[] = [
      VendorApplicationStatus.DRAFT,
      VendorApplicationStatus.CHANGES_REQUESTED,
    ];

    if (!editableStatuses.includes(application.status)) {
      throw new AppError(
        `Cannot edit application in "${application.status}" status. ` +
        `Only DRAFT or CHANGES_REQUESTED applications can be edited.`
      );
    }

    const {
      ownerName,
      shopName,
      businessEmail,
      businessPhone,
      description,
      shopLogoUrl,
      shopBannerUrl,
      shopCategoryId,
      businessType,
      gstin,
      panNumber,
    } = data;

    const updateData: any = {};
    if (ownerName !== undefined) updateData.ownerName = ownerName.trim();
    if (shopName !== undefined) updateData.shopName = shopName.trim();
    if (businessEmail !== undefined) updateData.businessEmail = businessEmail || null;
    if (businessPhone !== undefined) updateData.businessPhone = businessPhone || null;
    if (description !== undefined) updateData.description = description || null;
    if (shopLogoUrl !== undefined) updateData.shopLogoUrl = shopLogoUrl || null;
    if (shopBannerUrl !== undefined) updateData.shopBannerUrl = shopBannerUrl || null;
    if (shopCategoryId !== undefined) updateData.shopCategoryId = shopCategoryId || null;
    if (businessType !== undefined) updateData.businessType = businessType || null;
    if (gstin !== undefined) updateData.gstin = gstin || null;
    if (panNumber !== undefined) updateData.panNumber = panNumber || null;

    const updated = await prisma.vendorApplication.update({
      where: { vendorUserId },
      data: updateData,
      include: {
        documents: true,
        bankAccount: true,
        pickupAddress: true,
      },
    });

    await this.createAuditLog({
      applicationId: application.id,
      vendorPerformer: vendorUserId,
      action: 'UPDATE',
      entity: 'VendorApplication',
      entityId: application.id,
      oldValue: data,
      newValue: updateData,
    });

    return updated;
  }

  /**
   * Submit the application for review (DRAFT/CHANGES_REQUESTED → SUBMITTED)
   */
  static async submitApplication(vendorUserId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
      include: {
        documents: true,
        bankAccount: true,
        pickupAddress: true,
      },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    const submittableStatuses: VendorApplicationStatus[] = [
      VendorApplicationStatus.DRAFT,
      VendorApplicationStatus.CHANGES_REQUESTED,
    ];

    if (!submittableStatuses.includes(application.status)) {
      throw new AppError(
        `Cannot submit application in "${application.status}" status. ` +
        `Only DRAFT or CHANGES_REQUESTED applications can be submitted.`
      );
    }

    // Validate minimum required fields
    if (!application.ownerName || !application.shopName) {
      throw new AppError('ownerName and shopName are required before submission');
    }

    if (!application.pickupAddress) {
      throw new AppError('Pickup address is required before submission');
    }

    if (!application.bankAccount) {
      throw new AppError('Bank account details are required before submission');
    }

    const oldStatus = application.status;

    const updated = await prisma.vendorApplication.update({
      where: { vendorUserId },
      data: {
        status: VendorApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    await this.createAuditLog({
      applicationId: application.id,
      vendorPerformer: vendorUserId,
      action: 'STATUS_CHANGE',
      entity: 'VendorApplication',
      entityId: application.id,
      oldValue: { status: oldStatus },
      newValue: { status: 'SUBMITTED' },
      remarks: 'Vendor submitted application for review',
    });

    return {
      message: 'Application submitted successfully! It will be reviewed by our team.',
      application: updated,
    };
  }

  // ==========================================
  // 2. DOCUMENT MANAGEMENT
  // ==========================================

  /**
   * Upload/add a KYC document to the application
   */
  static async addDocument(vendorUserId: string, data: any) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    const editableStatuses: VendorApplicationStatus[] = [
      VendorApplicationStatus.DRAFT,
      VendorApplicationStatus.CHANGES_REQUESTED,
      VendorApplicationStatus.SUBMITTED,
      VendorApplicationStatus.UNDER_REVIEW,
    ];

    if (!editableStatuses.includes(application.status)) {
      throw new AppError(`Cannot add documents when application is "${application.status}"`);
    }

    const { docType, fileUrl, fileName } = data;

    if (!docType || !fileUrl) {
      throw new AppError('docType and fileUrl are required');
    }

    const document = await prisma.vendorDocument.create({
      data: {
        applicationId: application.id,
        docType: docType.toUpperCase(),
        fileUrl,
        fileName: fileName || null,
        status: DocumentStatus.PENDING,
      },
    });

    await this.createAuditLog({
      applicationId: application.id,
      vendorPerformer: vendorUserId,
      action: 'DOCUMENT_UPLOAD',
      entity: 'VendorDocument',
      entityId: document.id,
      newValue: { docType, fileUrl },
    });

    return document;
  }

  /**
   * Delete a document (only if PENDING)
   */
  static async deleteDocument(vendorUserId: string, documentId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    const document = await prisma.vendorDocument.findFirst({
      where: { id: documentId, applicationId: application.id },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (document.status !== DocumentStatus.PENDING) {
      throw new AppError(`Cannot delete a document that has been ${document.status}`);
    }

    await prisma.vendorDocument.delete({ where: { id: documentId } });

    await this.createAuditLog({
      applicationId: application.id,
      vendorPerformer: vendorUserId,
      action: 'DELETE',
      entity: 'VendorDocument',
      entityId: documentId,
      oldValue: { docType: document.docType, fileUrl: document.fileUrl },
    });

    return { message: 'Document deleted successfully' };
  }

  /**
   * List documents for my application
   */
  static async getMyDocuments(vendorUserId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    return application.documents;
  }

  // ==========================================
  // 3. BANK ACCOUNT MANAGEMENT
  // ==========================================

  /**
   * Add or update bank account details
   */
  static async upsertBankAccount(vendorUserId: string, data: any) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
      include: { bankAccount: true },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    const editableStatuses: VendorApplicationStatus[] = [
      VendorApplicationStatus.DRAFT,
      VendorApplicationStatus.CHANGES_REQUESTED,
    ];

    if (!editableStatuses.includes(application.status)) {
      throw new AppError(`Cannot modify bank account when application is "${application.status}"`);
    }

    const { accountNumber, ifsc, beneficiaryName, bankName, branchName, accountType } = data;

    if (!accountNumber || !ifsc || !beneficiaryName) {
      throw new AppError('accountNumber, ifsc, and beneficiaryName are required');
    }

    const bankData = {
      accountNumber,
      ifsc: ifsc.toUpperCase(),
      beneficiaryName: beneficiaryName.trim(),
      bankName: bankName || null,
      branchName: branchName || null,
      accountType: accountType || 'SAVINGS',
      status: BankAccountStatus.PENDING_VERIFICATION,
      verifiedByAdminId: null,
      remarks: null,
      verifiedAt: null,
    };

    let bankAccount;
    const action = application.bankAccount ? 'UPDATE' : 'CREATE';

    if (application.bankAccount) {
      bankAccount = await prisma.vendorBankAccount.update({
        where: { applicationId: application.id },
        data: bankData,
      });
    } else {
      bankAccount = await prisma.vendorBankAccount.create({
        data: {
          applicationId: application.id,
          ...bankData,
        },
      });
    }

    await this.createAuditLog({
      applicationId: application.id,
      vendorPerformer: vendorUserId,
      action,
      entity: 'VendorBankAccount',
      entityId: bankAccount.id,
      newValue: { accountNumber: `****${accountNumber.slice(-4)}`, ifsc, beneficiaryName },
    });

    return bankAccount;
  }

  /**
   * Get my bank account details
   */
  static async getMyBankAccount(vendorUserId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
      include: { bankAccount: true },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    return application.bankAccount;
  }

  // ==========================================
  // 4. PICKUP ADDRESS MANAGEMENT
  // ==========================================

  /**
   * Add or update pickup address
   */
  static async upsertPickupAddress(vendorUserId: string, data: any) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
      include: { pickupAddress: true },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    const editableStatuses: VendorApplicationStatus[] = [
      VendorApplicationStatus.DRAFT,
      VendorApplicationStatus.CHANGES_REQUESTED,
    ];

    if (!editableStatuses.includes(application.status)) {
      throw new AppError(`Cannot modify pickup address when application is "${application.status}"`);
    }

    const {
      contactName, contactPhone,
      addressLine, landmark,
      city, state, pincode, country,
      latitude, longitude,
    } = data;

    if (!addressLine || !city || !state || !pincode || latitude === undefined || longitude === undefined) {
      throw new AppError('addressLine, city, state, pincode, latitude, and longitude are required');
    }

    const addressData = {
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      addressLine,
      landmark: landmark || null,
      city,
      state,
      pincode,
      country: country || 'India',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      status: PickupAddressStatus.PENDING,
      verifiedByAdminId: null,
      remarks: null,
      verifiedAt: null,
    };

    let pickupAddress;
    const action = application.pickupAddress ? 'UPDATE' : 'CREATE';

    if (application.pickupAddress) {
      pickupAddress = await prisma.vendorPickupAddress.update({
        where: { applicationId: application.id },
        data: addressData,
      });
    } else {
      pickupAddress = await prisma.vendorPickupAddress.create({
        data: {
          applicationId: application.id,
          ...addressData,
        },
      });
    }

    await this.createAuditLog({
      applicationId: application.id,
      vendorPerformer: vendorUserId,
      action,
      entity: 'VendorPickupAddress',
      entityId: pickupAddress.id,
      newValue: { addressLine, city, state, pincode, latitude, longitude },
    });

    return pickupAddress;
  }

  /**
   * Get my pickup address
   */
  static async getMyPickupAddress(vendorUserId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { vendorUserId },
      include: { pickupAddress: true },
    });

    if (!application) {
      throw new AppError('No vendor application found', 404);
    }

    return application.pickupAddress;
  }

  // ==========================================
  // 5. ADMIN: APPLICATION REVIEW WORKFLOW
  // ==========================================

  /**
   * Admin: List all vendor applications with filtering
   */
  static async adminListApplications(query: any) {
    const { status, search, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { ownerName: { contains: search, mode: 'insensitive' } },
        { shopName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { businessPhone: { contains: search, mode: 'insensitive' } },
        { vendorUser: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.vendorApplication.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          vendorUser: {
            select: { id: true, name: true, email: true, phone: true, status: true },
          },
          documents: {
            select: { id: true, docType: true, status: true },
          },
          bankAccount: {
            select: { id: true, status: true },
          },
          pickupAddress: {
            select: { id: true, status: true, city: true, state: true },
          },
        },
      }),
      prisma.vendorApplication.count({ where }),
    ]);

    return {
      applications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Admin: Get a single application with full details
   */
  static async adminGetApplication(applicationId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      include: {
        vendorUser: {
          select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        bankAccount: true,
        pickupAddress: true,
        shop: {
          select: { id: true, name: true, slug: true, status: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!application) {
      throw new AppError('Vendor application not found', 404);
    }

    const completionStatus = this.calculateCompletionStatus(application);

    return {
      ...application,
      completionStatus,
    };
  }

  /**
   * Admin: Move application to UNDER_REVIEW
   */
  static async adminStartReview(applicationId: string, adminId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (application.status !== VendorApplicationStatus.SUBMITTED) {
      throw new AppError(`Can only start review for SUBMITTED applications. Current: ${application.status}`);
    }

    const oldStatus = application.status;

    const updated = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: VendorApplicationStatus.UNDER_REVIEW,
        reviewedByAdminId: adminId,
      },
    });

    await this.createAuditLog({
      applicationId,
      performedBy: adminId,
      action: 'STATUS_CHANGE',
      entity: 'VendorApplication',
      entityId: applicationId,
      oldValue: { status: oldStatus },
      newValue: { status: 'UNDER_REVIEW' },
      remarks: 'Admin started reviewing application',
    });

    return updated;
  }

  /**
   * Admin: Request changes from vendor
   */
  static async adminRequestChanges(applicationId: string, adminId: string, remarks: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const reviewableStatuses: VendorApplicationStatus[] = [
      VendorApplicationStatus.SUBMITTED,
      VendorApplicationStatus.UNDER_REVIEW,
    ];

    if (!reviewableStatuses.includes(application.status)) {
      throw new AppError(`Cannot request changes for application in "${application.status}" status`);
    }

    if (!remarks) {
      throw new AppError('Remarks are required when requesting changes');
    }

    const oldStatus = application.status;

    const updated = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: VendorApplicationStatus.CHANGES_REQUESTED,
        reviewedByAdminId: adminId,
        reviewRemarks: remarks,
        reviewedAt: new Date(),
      },
    });

    await this.createAuditLog({
      applicationId,
      performedBy: adminId,
      action: 'STATUS_CHANGE',
      entity: 'VendorApplication',
      entityId: applicationId,
      oldValue: { status: oldStatus },
      newValue: { status: 'CHANGES_REQUESTED', remarks },
      remarks,
    });

    return updated;
  }

  /**
   * Admin: Approve the application → creates a Shop + activates VendorUser
   */
  static async adminApproveApplication(applicationId: string, adminId: string, remarks?: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      include: {
        bankAccount: true,
        pickupAddress: true,
        vendorUser: true,
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const approvableStatuses: VendorApplicationStatus[] = [
      VendorApplicationStatus.SUBMITTED,
      VendorApplicationStatus.UNDER_REVIEW,
    ];

    if (!approvableStatuses.includes(application.status)) {
      throw new AppError(`Cannot approve application in "${application.status}" status`);
    }

    const oldStatus = application.status;

    // Generate unique slug for the shop
    let baseSlug = application.shopName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!baseSlug) baseSlug = 'shop';

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.shop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create shop and update everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Shop — ownerId still needed (we use the vendorUser.id as a placeholder)
      //    Shop.owner is a required relation to User. For separate vendor system,
      //    we set vendorOwnerId and use a system/admin user for ownerId.
      const shop = await tx.shop.create({
        data: {
          ownerId: adminId, // Admin as nominal owner in User table
          vendorOwnerId: application.vendorUserId, // Actual vendor owner
          name: application.shopName,
          slug,
          description: application.description,
          logoUrl: application.shopLogoUrl,
          bannerUrl: application.shopBannerUrl,
          businessEmail: application.businessEmail,
          businessPhone: application.businessPhone,
          gstin: application.gstin,
          panNumber: application.panNumber,
          status: ShopStatus.ACTIVE,
          // Copy bank details to shop for payout flow
          bankAccountNumber: application.bankAccount?.accountNumber || null,
          bankIfsc: application.bankAccount?.ifsc || null,
          bankBeneficiaryName: application.bankAccount?.beneficiaryName || null,
          // Copy pickup address lat/lng
          latitude: application.pickupAddress?.latitude || null,
          longitude: application.pickupAddress?.longitude || null,
          addressLine: application.pickupAddress?.addressLine || null,
          city: application.pickupAddress?.city || null,
          state: application.pickupAddress?.state || null,
          pincode: application.pickupAddress?.pincode || null,
          vendorApplicationId: application.id,
        },
      });

      // 2. Approve the application
      const updatedApp = await tx.vendorApplication.update({
        where: { id: applicationId },
        data: {
          status: VendorApplicationStatus.APPROVED,
          reviewedByAdminId: adminId,
          reviewRemarks: remarks || 'Application approved',
          reviewedAt: new Date(),
        },
      });

      // 3. Activate the VendorUser
      await tx.vendorUser.update({
        where: { id: application.vendorUserId },
        data: { status: 'ACTIVE' },
      });

      return { application: updatedApp, shop };
    });

    await this.createAuditLog({
      applicationId,
      performedBy: adminId,
      action: 'APPROVAL',
      entity: 'VendorApplication',
      entityId: applicationId,
      oldValue: { status: oldStatus },
      newValue: { status: 'APPROVED', shopId: result.shop.id, shopSlug: result.shop.slug },
      remarks: remarks || 'Application approved. Shop created.',
    });

    return {
      message: 'Vendor application approved! Shop has been created.',
      application: result.application,
      shop: result.shop,
    };
  }

  /**
   * Admin: Reject the application
   */
  static async adminRejectApplication(applicationId: string, adminId: string, remarks: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (application.status === VendorApplicationStatus.APPROVED) {
      throw new AppError('Cannot reject an already approved application');
    }

    if (!remarks) {
      throw new AppError('Remarks are required when rejecting an application');
    }

    const oldStatus = application.status;

    const updated = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: VendorApplicationStatus.REJECTED,
        reviewedByAdminId: adminId,
        reviewRemarks: remarks,
        reviewedAt: new Date(),
      },
    });

    await this.createAuditLog({
      applicationId,
      performedBy: adminId,
      action: 'REJECTION',
      entity: 'VendorApplication',
      entityId: applicationId,
      oldValue: { status: oldStatus },
      newValue: { status: 'REJECTED' },
      remarks,
    });

    return updated;
  }

  // ==========================================
  // 6. ADMIN: DOCUMENT VERIFICATION
  // ==========================================

  /**
   * Admin: Verify or reject a vendor document
   */
  static async adminVerifyDocument(documentId: string, adminId: string, data: any) {
    const { status, remarks } = data;

    if (!status || ![DocumentStatus.VERIFIED, DocumentStatus.REJECTED].includes(status)) {
      throw new AppError('status must be VERIFIED or REJECTED');
    }

    const document = await prisma.vendorDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const oldStatus = document.status;

    const updated = await prisma.vendorDocument.update({
      where: { id: documentId },
      data: {
        status,
        verifiedByAdminId: adminId,
        remarks: remarks || null,
        verifiedAt: new Date(),
      },
    });

    await this.createAuditLog({
      applicationId: document.applicationId,
      performedBy: adminId,
      action: 'DOCUMENT_VERIFY',
      entity: 'VendorDocument',
      entityId: documentId,
      oldValue: { status: oldStatus },
      newValue: { status, remarks },
      remarks: remarks || `Document ${status.toLowerCase()}`,
    });

    return updated;
  }

  // ==========================================
  // 7. ADMIN: BANK ACCOUNT VERIFICATION
  // ==========================================

  /**
   * Admin: Verify or reject vendor bank account
   */
  static async adminVerifyBankAccount(bankAccountId: string, adminId: string, data: any) {
    const { status, remarks } = data;

    if (!status || ![BankAccountStatus.VERIFIED, BankAccountStatus.REJECTED].includes(status)) {
      throw new AppError('status must be VERIFIED or REJECTED');
    }

    const bankAccount = await prisma.vendorBankAccount.findUnique({
      where: { id: bankAccountId },
      include: { application: true },
    });

    if (!bankAccount) {
      throw new AppError('Bank account not found', 404);
    }

    const oldStatus = bankAccount.status;

    const updated = await prisma.vendorBankAccount.update({
      where: { id: bankAccountId },
      data: {
        status,
        verifiedByAdminId: adminId,
        remarks: remarks || null,
        verifiedAt: new Date(),
      },
    });

    await this.createAuditLog({
      applicationId: bankAccount.applicationId,
      performedBy: adminId,
      action: 'BANK_VERIFY',
      entity: 'VendorBankAccount',
      entityId: bankAccountId,
      oldValue: { status: oldStatus },
      newValue: { status, remarks },
      remarks: remarks || `Bank account ${status.toLowerCase()}`,
    });

    return updated;
  }

  // ==========================================
  // 8. ADMIN: PICKUP ADDRESS VERIFICATION
  // ==========================================

  /**
   * Admin: Verify or reject vendor pickup address
   */
  static async adminVerifyPickupAddress(addressId: string, adminId: string, data: any) {
    const { status, remarks } = data;

    if (!status || ![PickupAddressStatus.VERIFIED, PickupAddressStatus.REJECTED].includes(status)) {
      throw new AppError('status must be VERIFIED or REJECTED');
    }

    const address = await prisma.vendorPickupAddress.findUnique({
      where: { id: addressId },
      include: { application: true },
    });

    if (!address) {
      throw new AppError('Pickup address not found', 404);
    }

    const oldStatus = address.status;

    const updated = await prisma.vendorPickupAddress.update({
      where: { id: addressId },
      data: {
        status,
        verifiedByAdminId: adminId,
        remarks: remarks || null,
        verifiedAt: new Date(),
      },
    });

    await this.createAuditLog({
      applicationId: address.applicationId,
      performedBy: adminId,
      action: 'ADDRESS_VERIFY',
      entity: 'VendorPickupAddress',
      entityId: addressId,
      oldValue: { status: oldStatus },
      newValue: { status, remarks },
      remarks: remarks || `Pickup address ${status.toLowerCase()}`,
    });

    return updated;
  }

  // ==========================================
  // 9. ADMIN: AUDIT LOG
  // ==========================================

  /**
   * Admin: Get audit log for an application
   */
  static async getApplicationAuditLog(applicationId: string, query: any) {
    const { page = 1, limit = 50 } = query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.vendorAuditLog.findMany({
        where: { applicationId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vendorAuditLog.count({ where: { applicationId } }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Calculate completion status for the application
   */
  private static calculateCompletionStatus(application: any) {
    const steps: Record<string, boolean> = {
      basicInfo: !!(application.ownerName && application.shopName),
      businessInfo: !!(application.gstin || application.panNumber),
      documents: application.documents && application.documents.length > 0,
      bankAccount: !!application.bankAccount,
      pickupAddress: !!application.pickupAddress,
    };

    const completed = Object.values(steps).filter(Boolean).length;
    const total = Object.keys(steps).length;

    return {
      steps,
      completedSteps: completed,
      totalSteps: total,
      percentage: Math.round((completed / total) * 100),
      isReadyToSubmit: steps.basicInfo && steps.bankAccount && steps.pickupAddress,
    };
  }

  /**
   * Create an immutable audit log entry
   * Supports both admin (performedBy) and vendor (vendorPerformer) actors
   */
  private static async createAuditLog(data: {
    applicationId: string | null;
    performedBy?: string;     // admin userId
    vendorPerformer?: string; // vendorUserId
    action: string;
    entity: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    remarks?: string;
    ipAddress?: string;
  }) {
    try {
      await prisma.vendorAuditLog.create({
        data: {
          applicationId: data.applicationId || null,
          performedBy: data.performedBy || null,
          vendorPerformer: data.vendorPerformer || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          oldValue: data.oldValue || null,
          newValue: data.newValue || null,
          remarks: data.remarks || null,
          ipAddress: data.ipAddress || null,
        },
      });
    } catch (err: any) {
      // Audit log failure should never break the main flow
      console.error('[VENDOR_AUDIT_LOG] Failed to create audit entry:', err?.message || err);
    }
  }
}
