import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Communities ──────────────────────────────────────
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  adminId: varchar("admin_id"), // Refers to users.id
  type: text("type").notNull().default("Housing Society"), // Housing Society, Apartment Complex, NGO, Corporate, Public
  maxMembers: integer("max_members").notNull().default(100),
  address: text("address").notNull().default(""),
  joinType: text("join_type").notNull().default("request"), // 'open' or 'request'
  totalDonations: integer("total_donations").notNull().default(0),
  totalMealsSaved: integer("total_meals_saved").notNull().default(0),
  totalCo2Reduced: real("total_co2_reduced").notNull().default(0),
  avgResponseTimeMins: integer("avg_response_time_mins").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
});
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

// ── Community Members ────────────────────────────────
export const communityMembers = pgTable("community_members", {
  userId: varchar("user_id").notNull(), // We skip actual foreign key constraints for simplicity, or we can use references()
  communityId: varchar("community_id").notNull(),
  role: text("role").notNull().default("member"), // 'admin' or 'member'
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
});
export const insertCommunityMemberSchema = createInsertSchema(communityMembers).omit({ joinedAt: true });
export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
export type CommunityMember = typeof communityMembers.$inferSelect;

// ── Community Join Requests ──────────────────────────
export const communityJoinRequests = pgTable("community_join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  communityId: varchar("community_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});
export const insertCommunityJoinRequestSchema = createInsertSchema(communityJoinRequests).omit({ id: true, createdAt: true });
export type InsertCommunityJoinRequest = z.infer<typeof insertCommunityJoinRequestSchema>;
export type CommunityJoinRequest = typeof communityJoinRequests.$inferSelect;

// ── Users ────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").notNull().default("Donor"), // Legacy role
  userCategory: text("user_category").notNull().default("Household"), // 'Pure Donor', 'Pure Receiver', 'Household'
  avatar: text("avatar"),
  foodSaved: real("food_saved").notNull().default(0),
  donationsMade: integer("donations_made").notNull().default(0),
  co2Reduced: real("co2_reduced").notNull().default(0),
  mealsProvided: integer("meals_provided").notNull().default(0),
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  entityType: text("entity_type"), // Hotel, Convention Hall, Old Age Home, Orphanage, etc.
  buildingName: text("building_name"),
  badges: integer("badges").notNull().default(0),
  greenPoints: integer("green_points").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  name: true,
  role: true,
  userCategory: true,
  avatar: true,
  latitude: true,
  longitude: true,
  address: true,
  entityType: true,
  buildingName: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Pantry Items ─────────────────────────────────────
export const pantryItems = pgTable("pantry_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  storageLocation: text("storage_location").notNull(),
  notes: text("notes"),
  addedAt: integer("added_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertPantryItemSchema = createInsertSchema(pantryItems).omit({
  id: true,
  addedAt: true,
});
export type InsertPantryItem = z.infer<typeof insertPantryItemSchema>;
export type PantryItem = typeof pantryItems.$inferSelect;

// ── Donations ─────────────────────────────────────────
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  communityId: varchar("community_id"), // Optional: scoped to community
  title: text("title").notNull(), 
  foodCategory: text("food_category").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  status: text("status").notNull().default("active"), // active, reserved, collected, expired, cancelled
  visibility: text("visibility").notNull().default("community_first"), // community, public, community_first
  metadata: jsonb("metadata"), // sections 2-8 specifics
  aiAnalysis: jsonb("ai_analysis"), // section 9 AI details
  images: jsonb("images"), // array of image URLs
  escalationLevel: integer("escalation_level").notNull().default(1),
  expiryTime: timestamp("expiry_time"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  postedAt: integer("posted_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  postedAt: true,
});
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

// ── Peer Requests ─────────────────────────────────────
export const peerRequests = pgTable("peer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityId: varchar("community_id"), // if null, it's public
  title: text("title").notNull(),
  foodCategory: text("food_category").notNull(),
  itemName: text("item_name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  urgency: text("urgency").notNull(), // "Today", "Within 24 Hours", "Flexible"
  visibility: text("visibility").notNull(), // "community_first", "community", "public"
  metadata: jsonb("metadata"), // description, pickupLocation, pickupTime, contactPerson, peopleCount, additionalNote
  status: text("status").notNull().default("active"), // active, fulfilled, cancelled
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPeerRequestSchema = createInsertSchema(peerRequests).omit({
  id: true,
  createdAt: true,
});
export type InsertPeerRequest = z.infer<typeof insertPeerRequestSchema>;
export type PeerRequest = typeof peerRequests.$inferSelect;

// ── Matches ───────────────────────────────────────────
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donationId: varchar("donation_id").references(() => donations.id, { onDelete: "cascade" }),
  peerRequestId: varchar("peer_request_id").references(() => peerRequests.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  priorityScore: real("priority_score").notNull().default(0), // 0-100%
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, collected
  otp: text("otp"), // 4-digit verification code
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// ── Notifications ─────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  timestamp: integer("timestamp").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  timestamp: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;