import { z } from "zod";
import {
  insertUserSchema,
  insertPantryItemSchema,
  insertDonationSchema,
  insertCommunitySchema,
  insertCommunityMemberSchema,
  insertCommunityJoinRequestSchema,
  insertPeerRequestSchema,
  insertMatchSchema,
  insertNotificationSchema,
} from "@shared/schema";

// Re-export schemas for convenience
export {
  insertUserSchema,
  insertPantryItemSchema,
  insertDonationSchema,
  insertCommunitySchema,
  insertCommunityMemberSchema,
  insertCommunityJoinRequestSchema,
  insertPeerRequestSchema,
  insertMatchSchema,
  insertNotificationSchema,
};

// Auth sync validation
export const authSyncSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string().optional(),
  userCategory: z.string().optional(),
  entityType: z.string().optional(),
  buildingName: z.string().optional(),
  avatar: z.string().optional(),
});

// Pantry migration validation
export const pantryMigrationSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(z.object({
    name: z.string(),
    category: z.string(),
    quantity: z.string(),
    unit: z.string(),
    purchaseDate: z.string(),
    expiryDate: z.string(),
    storageLocation: z.string(),
    notes: z.string().optional(),
  })),
});

// Donation creation validation
export const createDonationSchema = insertDonationSchema.extend({
  userId: z.string().uuid(),
  communityId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  expiryTime: z.union([z.string().datetime(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// AI Analysis donation validation
export const analyzeAndCreateDonationSchema = z.object({
  userId: z.string().uuid(),
  communityId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  foodCategory: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  visibility: z.string().optional(),
  metadata: z.any().optional(),
  imagesBase64: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  expiryTime: z.union([z.string().datetime(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
});

// Community creation validation
export const createCommunitySchema = insertCommunitySchema.extend({
  adminId: z.string().uuid(),
  name: z.string().min(1, "Community name is required"),
});

// Community join validation
export const joinCommunitySchema = z.object({
  userId: z.string().uuid(),
});

// Leave community validation
export const leaveCommunitySchema = z.object({
  userId: z.string().uuid(),
});

// Join request status update validation
export const updateJoinRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

// Peer request validation
export const createPeerRequestSchema = insertPeerRequestSchema;

// Match acceptance validation
export const acceptMatchSchema = z.object({
  receiverId: z.string().uuid(),
  peerRequestId: z.string().uuid().optional(),
});

// OTP verification validation
export const verifyMatchSchema = z.object({
  otp: z.string().length(4, "OTP must be 4 digits"),
});

// Recipe suggestion validation
export const recipeSuggestionSchema = z.object({
  urgentIngredients: z.array(z.string()).default([]),
  normalIngredients: z.array(z.string()).default([]),
});

// Scan validation
export const scanSchema = z.object({
  imageBase64: z.string().min(1, "Image is required"),
  mediaType: z.string().default("image/jpeg"),
});

// Receipt scan validation
export const receiptScanSchema = scanSchema;

// User update validation (partial)
export const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  userCategory: z.string().optional(),
  entityType: z.string().optional(),
  buildingName: z.string().optional(),
  avatar: z.string().optional(),
  foodSaved: z.number().optional(),
  donationsMade: z.number().optional(),
  co2Reduced: z.number().optional(),
  mealsProvided: z.number().optional(),
});

// Helper function to validate request body
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      return res.status(400).json({ error: "Invalid request body" });
    }
  };
}

// Helper function to validate query parameters
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: error.errors 
        });
      }
      return res.status(400).json({ error: "Invalid query parameters" });
    }
  };
}