/**
 * File Storage Functions
 *
 * Handles file uploads using Convex File Storage.
 * Used for organization logos, staff profile images, service images, etc.
 */

import { ConvexError, v } from "convex/values";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  ownerMutation,
} from "./lib/functions";

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// =============================================================================
// Queries
// =============================================================================

/**
 * Get URLs for multiple storage files (for photo thumbnails)
 */
export const getFileUrls = authedQuery({
  args: { storageIds: v.array(v.id("_storage")) },
  returns: v.array(v.union(v.string(), v.null())),
  handler: async (ctx, args) => {
    return Promise.all(args.storageIds.map((id) => ctx.storage.getUrl(id)));
  },
});

/**
 * Get a URL for a file from storage
 * Used to retrieve URLs for uploaded files
 */
export const getFileUrl = authedMutation({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Generate an upload URL for file storage
 * Returns a URL that can be used to upload a file directly to Convex storage
 */
export const generateUploadUrl = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save organization logo
 * Called after file is uploaded to storage
 */
export const saveOrganizationLogo = ownerMutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Note: fileSize and fileType are client-provided and cannot be validated
    // server-side due to Convex storage API limitations. Client-side validation
    // exists in LogoUpload.tsx as a first line of defense.

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(args.fileType)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Only JPEG, PNG, and WebP images are allowed",
      });
    }

    // Get the URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to get file URL",
      });
    }

    // Update organization with new logo
    await ctx.db.patch(ctx.organizationId, {
      logo: url,
      updatedAt: Date.now(),
    });

    return url;
  },
});

/**
 * Delete organization logo
 */
export const deleteOrganizationLogo = ownerMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const org = await ctx.db.get(ctx.organizationId);
    if (!org) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization not found",
      });
    }

    // Note: We don't delete from storage to avoid breaking cached URLs.
    // Old files remain in storage. Consider implementing manual cleanup
    // via a scheduled function if storage costs become an issue.

    await ctx.db.patch(ctx.organizationId, {
      logo: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Save staff profile image
 * Called after file is uploaded to storage
 */
export const saveStaffImage = authedMutation({
  args: {
    staffId: v.id("staff"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(args.fileType)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Only JPEG, PNG, and WebP images are allowed",
      });
    }

    // Get staff record
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    // Check permission: either own profile or admin/owner
    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", staff.organizationId).eq("userId", ctx.user._id),
      )
      .first();

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    if (staff.userId !== ctx.user._id && member.role !== "owner") {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have permission to update this profile",
      });
    }

    // Get the URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to get file URL",
      });
    }

    // Update staff with new image
    await ctx.db.patch(args.staffId, {
      imageUrl: url,
      updatedAt: Date.now(),
    });

    return url;
  },
});

/**
 * Save service image
 * Called after file is uploaded to storage
 */
export const saveServiceImage = ownerMutation({
  args: {
    serviceId: v.id("services"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(args.fileType)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Only JPEG, PNG, and WebP images are allowed",
      });
    }

    // Verify service belongs to this organization
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Service not found",
      });
    }

    // Get the URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to get file URL",
      });
    }

    // Update service with new image
    await ctx.db.patch(args.serviceId, {
      imageUrl: url,
      updatedAt: Date.now(),
    });

    return url;
  },
});

/**
 * Save product images (append to existing)
 * Called after files are uploaded to storage
 */
export const saveProductImages = ownerMutation({
  args: {
    productId: v.id("products"),
    storageIds: v.array(v.id("_storage")),
    fileNames: v.array(v.string()),
    fileTypes: v.array(v.string()),
    fileSizes: v.array(v.number()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    // Verify product belongs to this organization
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    // Validate each file
    for (let i = 0; i < args.storageIds.length; i++) {
      if (args.fileSizes[i] > MAX_FILE_SIZE) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: `File ${args.fileNames[i]} exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      }
      if (!ALLOWED_IMAGE_TYPES.includes(args.fileTypes[i])) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Only JPEG, PNG, and WebP images are allowed",
        });
      }
    }

    // Check total count ≤ 4
    const existingIds = product.imageStorageIds ?? [];
    if (existingIds.length + args.storageIds.length > 4) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Maximum 4 images allowed per product",
      });
    }

    // Resolve URLs
    const newUrls = await Promise.all(
      args.storageIds.map((id) => ctx.storage.getUrl(id)),
    );
    const validUrls = newUrls.filter((u): u is string => u !== null);

    const allStorageIds = [...existingIds, ...args.storageIds];
    const allUrls = [...(product.imageUrls ?? []), ...validUrls];

    await ctx.db.patch(args.productId, {
      imageStorageIds: allStorageIds,
      imageUrls: allUrls,
      updatedAt: Date.now(),
    });

    return allUrls;
  },
});

/**
 * Remove a single product image by storageId
 */
export const removeProductImage = ownerMutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    const existingIds = product.imageStorageIds ?? [];
    const existingUrls = product.imageUrls ?? [];

    const removeIndex = existingIds.indexOf(args.storageId);
    if (removeIndex === -1) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Image not found on this product",
      });
    }

    const newIds = existingIds.filter((_, i) => i !== removeIndex);
    const newUrls = existingUrls.filter((_, i) => i !== removeIndex);

    await ctx.db.patch(args.productId, {
      imageStorageIds: newIds.length > 0 ? newIds : undefined,
      imageUrls: newUrls.length > 0 ? newUrls : undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});
