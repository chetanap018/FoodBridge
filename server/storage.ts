import { config } from 'dotenv';
config({ path: '.env', override: true });
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { Pool } from "pg";
import { eq, and, desc, isNull, gt, or, sql } from "drizzle-orm";
import {
  users, pantryItems, donations, notifications, communities, peerRequests, matches,
  communityMembers, communityJoinRequests,
  type User, type InsertUser,
  type PantryItem, type InsertPantryItem,
  type Donation, type InsertDonation,
  type Notification,
  type Community, type InsertCommunity,
  type PeerRequest, type InsertPeerRequest,
  type Match, type InsertMatch,
  type CommunityMember, type InsertCommunityMember,
  type CommunityJoinRequest, type InsertCommunityJoinRequest
} from "@shared/schema";

function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  return drizzle(pool, { schema });
}

const db = getDb();

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getUsersByCommunity(communityId: string): Promise<User[]>;

  // Communities
  listCommunities(): Promise<(Community & { memberCount: number })[]>;
  getCommunity(id: string): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunityStats(id: string, data: Partial<Community>): Promise<Community>;

  // Community Members & Requests
  getUserCommunities(userId: string): Promise<(Community & { role: string })[]>;
  getCommunityMembers(communityId: string): Promise<(User & { role: string })[]>;
  addCommunityMember(member: InsertCommunityMember): Promise<CommunityMember>;
  removeCommunityMember(userId: string, communityId: string): Promise<boolean>;
  leaveCommunity(userId: string, communityId: string): Promise<{ success: boolean; message: string }>;
  createJoinRequest(request: InsertCommunityJoinRequest): Promise<CommunityJoinRequest>;
  getCommunityJoinRequests(communityId: string): Promise<(CommunityJoinRequest & { user: User })[]>;
  updateJoinRequestStatus(requestId: string, status: string): Promise<CommunityJoinRequest>;

  // Pantry
  getPantryItems(userId: string): Promise<PantryItem[]>;
  addPantryItem(item: InsertPantryItem): Promise<PantryItem>;
  removePantryItem(id: string, userId: string): Promise<boolean>;
  migratePantryItems(items: InsertPantryItem[]): Promise<void>;

  // Donations
  getDonations(userId?: string, communityId?: string): Promise<Donation[]>;
  addDonation(donation: InsertDonation): Promise<Donation>;
  updateDonationStatus(id: string, status: string, escalationLevel?: number): Promise<Donation>;
  getActiveDonations(): Promise<Donation[]>;

  // Peer Requests
  getPeerRequests(communityId: string | null): Promise<PeerRequest[]>;
  addPeerRequest(request: InsertPeerRequest): Promise<PeerRequest>;
  updatePeerRequestStatus(id: string, status: string): Promise<PeerRequest>;

  // Matches
  createMatch(match: InsertMatch): Promise<Match>;
  getMatchesForDonation(donationId: string): Promise<Match[]>;
  updateMatchStatus(id: string, status: string): Promise<Match>;
  acceptDonation(donationId: string, receiverId: string, peerRequestId?: string): Promise<{ success: boolean; match?: Match; otp?: string; error?: string }>;
  verifyMatch(matchId: string, otp: string): Promise<{ success: boolean; error?: string }>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<boolean>;
  clearAllNotifications(): Promise<void>;
  createNotification(notification: any): Promise<void>;
  checkAndNotifyExpiringPantry(): Promise<void>;
}

export class DbStorage implements IStorage {

  // ── Users ──────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUsersByCommunity(communityId: string): Promise<User[]> {
    const members = await db.select().from(communityMembers).where(eq(communityMembers.communityId, communityId));
    if (members.length === 0) return [];
    const userIds = members.map(m => m.userId);
    // Since we don't have an "in" operator handy imported, we can query them one by one or import 'inArray'.
    // Let's import 'inArray' from drizzle-orm dynamically or use a join.
    // Better yet, just use a join:
    const result = await db.select({ user: users })
      .from(users)
      .innerJoin(communityMembers, eq(users.id, communityMembers.userId))
      .where(eq(communityMembers.communityId, communityId));
    return result.map(r => r.user);
  }

  async upsertUser(user: InsertUser): Promise<User> {
    const { id, email, name, role, userCategory, avatar, latitude, longitude, address, entityType, buildingName } = user;
    const result = await db
      .insert(users)
      .values({ 
        id, 
        email, 
        name: name ?? null, 
        role: role ?? "Donor",
        userCategory: userCategory ?? "Household",
        avatar: avatar ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        address: address ?? null,
        entityType: entityType ?? null,
        buildingName: buildingName ?? null,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { 
          id,
          name: name ?? null,
          role: role ?? "Donor",
          userCategory: userCategory ?? "Household",
          entityType: entityType ?? null,
          buildingName: buildingName ?? null,
        },
      })
      .returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // ── Communities ────────────────────────────────────
  
  async listCommunities(): Promise<(Community & { memberCount: number })[]> {
    const allComms = await db.select().from(communities);
    const result = [];
    for (const comm of allComms) {
      const members = await db.select().from(communityMembers).where(eq(communityMembers.communityId, comm.id));
      result.push({ ...comm, memberCount: members.length });
    }
    return result;
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    const result = await db.select().from(communities).where(eq(communities.id, id));
    return result[0];
  }

  async createCommunity(community: InsertCommunity): Promise<Community> {
    const result = await db.insert(communities).values(community).returning();
    return result[0];
  }

  async updateCommunityStats(id: string, data: Partial<Community>): Promise<Community> {
    const result = await db
      .update(communities)
      .set(data)
      .where(eq(communities.id, id))
      .returning();
    return result[0];
  }

  // ── Community Members & Requests ───────────────────

  async getUserCommunities(userId: string): Promise<(Community & { role: string })[]> {
    const rows = await db.select({
      community: communities,
      role: communityMembers.role,
    })
    .from(communities)
    .innerJoin(communityMembers, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.userId, userId));
    
    // Filter out potential duplicates if they crept in before the fix
    const unique = new Map<string, (Community & { role: string })>();
    for (const r of rows) {
      if (!unique.has(r.community.id)) {
        unique.set(r.community.id, { ...r.community, role: r.role });
      }
    }
    return Array.from(unique.values());
  }

  async getCommunityMembers(communityId: string): Promise<(User & { role: string })[]> {
    const rows = await db.select({
      user: users,
      role: communityMembers.role,
    })
    .from(users)
    .innerJoin(communityMembers, eq(users.id, communityMembers.userId))
    .where(eq(communityMembers.communityId, communityId));
    
    // Filter out duplicates
    const unique = new Map<string, (User & { role: string })>();
    for (const r of rows) {
      if (!unique.has(r.user.id)) {
        unique.set(r.user.id, { ...r.user, role: r.role });
      }
    }
    return Array.from(unique.values());
  }

  async addCommunityMember(member: InsertCommunityMember): Promise<CommunityMember> {
    // Prevent duplicate entries
    const existing = await db.select()
      .from(communityMembers)
      .where(and(eq(communityMembers.userId, member.userId), eq(communityMembers.communityId, member.communityId)));
      
    if (existing.length > 0) {
      return existing[0]; // Already a member
    }

    const result = await db.insert(communityMembers).values(member).returning();
    return result[0];
  }

  async removeCommunityMember(userId: string, communityId: string): Promise<boolean> {
    const result = await db.delete(communityMembers)
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)))
      .returning();
    return result.length > 0;
  }

  async leaveCommunity(userId: string, communityId: string): Promise<{ success: boolean; message: string }> {
    return await db.transaction(async (tx) => {
      // Find the member record
      const memberRows = await tx.select().from(communityMembers)
        .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
      const member = memberRows[0];
      if (!member) return { success: false, message: 'User is not a member of this community.' };

      if (member.role === 'admin') {
        // Find next oldest member
        const otherMembers = await tx.select().from(communityMembers)
          .where(and(eq(communityMembers.communityId, communityId), sql`${communityMembers.userId} != ${userId}`))
          .orderBy(communityMembers.joinedAt);

        if (otherMembers.length > 0) {
          // Promote next member
          const nextAdmin = otherMembers[0];
          await tx.update(communityMembers).set({ role: 'admin' })
            .where(and(eq(communityMembers.userId, nextAdmin.userId), eq(communityMembers.communityId, communityId)));
          await tx.update(communities).set({ adminId: nextAdmin.userId })
            .where(eq(communities.id, communityId));
          // Delete the original admin
          await tx.delete(communityMembers).where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
          return { success: true, message: 'Admin role transferred and user left community.' };
        } else {
          // No one else is in the community, dissolve it
          await tx.delete(communities).where(eq(communities.id, communityId));
          // Note: foreign keys (if cascade) or manual cleanup might be needed, but for now just deleting the community is enough.
          await tx.delete(communityMembers).where(eq(communityMembers.communityId, communityId));
          return { success: true, message: 'Community dissolved as the last member left.' };
        }
      } else {
        // Just delete the member
        await tx.delete(communityMembers).where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
        return { success: true, message: 'User left the community.' };
      }
    });
  }

  async createJoinRequest(request: InsertCommunityJoinRequest): Promise<CommunityJoinRequest> {
    const result = await db.insert(communityJoinRequests).values(request).returning();
    return result[0];
  }

  async getCommunityJoinRequests(communityId: string): Promise<(CommunityJoinRequest & { user: User })[]> {
    const rows = await db.select({
      request: communityJoinRequests,
      user: users,
    })
    .from(communityJoinRequests)
    .innerJoin(users, eq(communityJoinRequests.userId, users.id))
    .where(and(eq(communityJoinRequests.communityId, communityId), eq(communityJoinRequests.status, "pending")));
    
    return rows.map(r => ({ ...r.request, user: r.user }));
  }

  async updateJoinRequestStatus(requestId: string, status: string): Promise<CommunityJoinRequest> {
    const result = await db.update(communityJoinRequests)
      .set({ status })
      .where(eq(communityJoinRequests.id, requestId))
      .returning();
    return result[0];
  }

  // ── Pantry ─────────────────────────────────────────

  async getPantryItems(userId: string): Promise<PantryItem[]> {
    return await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userId, userId))
      .orderBy(pantryItems.addedAt);
  }

  async addPantryItem(item: InsertPantryItem): Promise<PantryItem> {
    const result = await db.insert(pantryItems).values(item).returning();
    return result[0];
  }

  async removePantryItem(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async migratePantryItems(items: any[]): Promise<void> {
    if (items.length === 0) return;
    const itemsToInsert = items.map(({ id, ...rest }) => rest);
    await db.insert(pantryItems).values(itemsToInsert).onConflictDoNothing();
  }

  // ── Donations ──────────────────────────────────────

  async getDonations(userId?: string, communityId?: string): Promise<Donation[]> {
    let query = db.select().from(donations);
    
    if (userId) {
      return await query.where(eq(donations.userId, userId)).orderBy(desc(donations.postedAt));
    } else if (communityId) {
      return await query.where(eq(donations.communityId, communityId)).orderBy(desc(donations.postedAt));
    }
    
    return await query.orderBy(desc(donations.postedAt));
  }

  async getActiveDonations(): Promise<Donation[]> {
    return await db.select().from(donations)
      .where(and(
        eq(donations.status, 'active'),
        or(isNull(donations.expiryTime), gt(donations.expiryTime, sql`now()`))
      ))
      .orderBy(desc(donations.postedAt));
  }

  async addDonation(donation: InsertDonation): Promise<Donation> {
    const result = await db
      .insert(donations)
      .values({ ...donation, status: "active" })
      .returning();
    return result[0];
  }

  async updateDonationStatus(id: string, status: string, escalationLevel?: number): Promise<Donation> {
    const setArgs: Partial<Donation> = { status };
    if (escalationLevel !== undefined) {
      setArgs.escalationLevel = escalationLevel;
    }
    
    const result = await db
      .update(donations)
      .set(setArgs)
      .where(eq(donations.id, id))
      .returning();
    return result[0];
  }

  // ── Peer Requests ──────────────────────────────────

  async getPeerRequests(communityId: string | null): Promise<PeerRequest[]> {
    if (communityId === null) {
      return await db
        .select()
        .from(peerRequests)
        .where(isNull(peerRequests.communityId))
        .orderBy(desc(peerRequests.createdAt));
    } else {
      return await db
        .select()
        .from(peerRequests)
        .where(eq(peerRequests.communityId, communityId))
        .orderBy(desc(peerRequests.createdAt));
    }
  }

  async addPeerRequest(request: InsertPeerRequest): Promise<PeerRequest> {
    const result = await db.insert(peerRequests).values(request).returning();
    return result[0];
  }

  async getPeerRequest(id: string): Promise<PeerRequest | undefined> {
    const result = await db.select().from(peerRequests).where(eq(peerRequests.id, id));
    return result[0];
  }

  async updatePeerRequestStatus(id: string, status: string): Promise<PeerRequest> {
    const result = await db
      .update(peerRequests)
      .set({ status })
      .where(eq(peerRequests.id, id))
      .returning();
    return result[0];
  }

  // ── Matches ────────────────────────────────────────

  async createMatch(match: InsertMatch): Promise<Match> {
    const result = await db.insert(matches).values(match).returning();
    return result[0];
  }

  async getMatchesForDonation(donationId: string): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.donationId, donationId)).orderBy(desc(matches.priorityScore));
  }

  async updateMatchStatus(id: string, status: string): Promise<Match> {
    const result = await db
      .update(matches)
      .set({ status })
      .where(eq(matches.id, id))
      .returning();
    return result[0];
  }

  async acceptDonation(donationId: string, receiverId: string, peerRequestId?: string): Promise<{ success: boolean; match?: Match; otp?: string; error?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Atomic lock on donation
        const updatedDonation = await tx.update(donations)
          .set({ status: 'reserved' })
          .where(and(eq(donations.id, donationId), eq(donations.status, 'active')))
          .returning();
          
        if (updatedDonation.length === 0) {
          return { success: false, error: 'Donation is no longer available.' };
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const newMatch = await tx.insert(matches).values({
          donationId,
          receiverId,
          peerRequestId: peerRequestId || null,
          priorityScore: 100,
          status: 'accepted',
          otp
        }).returning();

        return { success: true, match: newMatch[0], otp };
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async verifyMatch(matchId: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await db.transaction(async (tx) => {
        const matchResult = await tx.select().from(matches).where(eq(matches.id, matchId));
        const match = matchResult[0];
        
        if (!match) return { success: false, error: 'Match not found' };
        if (match.status !== 'accepted') return { success: false, error: 'Match is not in accepted state' };
        if (match.otp !== otp) return { success: false, error: 'Invalid OTP' };

        // Update match
        await tx.update(matches).set({ status: 'collected' }).where(eq(matches.id, matchId));

        // Get donation to update stats
        if (match.donationId) {
          const donationResult = await tx.select().from(donations).where(eq(donations.id, match.donationId));
          const donation = donationResult[0];
          
          if (donation) {
            await tx.update(donations).set({ status: 'collected' }).where(eq(donations.id, donation.id));
            
            // Increment stats based on quantity (assuming 1 unit = 1 meal = 0.5kg saved = 1.2kg CO2 for simplicity)
            const qty = parseInt(donation.quantity) || 1;
            const meals = qty;
            const foodSaved = qty * 0.5;
            const co2 = qty * 1.2;

            // Update Donor
            const donorResult = await tx.select().from(users).where(eq(users.id, donation.userId));
            const donor = donorResult[0];
            if (donor) {
               await tx.update(users).set({
                 donationsMade: donor.donationsMade + 1,
                 mealsProvided: donor.mealsProvided + meals,
                 foodSaved: donor.foodSaved + foodSaved,
                 co2Reduced: donor.co2Reduced + co2
               }).where(eq(users.id, donor.id));
            }

            // Update Community if applicable
            if (donation.communityId) {
               const commResult = await tx.select().from(communities).where(eq(communities.id, donation.communityId));
               const comm = commResult[0];
               if (comm) {
                 await tx.update(communities).set({
                   totalDonations: comm.totalDonations + 1,
                   totalMealsSaved: comm.totalMealsSaved + meals,
                   totalCo2Reduced: comm.totalCo2Reduced + co2
                 }).where(eq(communities.id, comm.id));
               }
            }
          }
        }

        // Close peer request if applicable
        if (match.peerRequestId) {
           await tx.update(peerRequests).set({ status: 'fulfilled' }).where(eq(peerRequests.id, match.peerRequestId));
        }

        return { success: true };
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Notifications ──────────────────────────────────

  async getNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.timestamp));
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  async clearAllNotifications(): Promise<void> {
    await db.update(notifications).set({ read: true });
  }

  async createNotification(notif: any): Promise<void> {
    await db.insert(notifications).values(notif);
  }

  async checkAndNotifyExpiringPantry(): Promise<void> {
    const items = await db.select().from(pantryItems);
    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(now.getDate() + 2);

    for (const item of items) {
      if (!item.expiryDate) continue;
      const expiry = new Date(item.expiryDate);
      
      // If expiring within next 48 hours and hasn't expired yet
      if (expiry > now && expiry <= twoDaysFromNow) {
        const message = `Your pantry item '${item.name}' is expiring on ${expiry.toLocaleDateString()}! Consider donating it.`;
        
        // Very basic check to prevent duplicate notifications (assuming message uniqueness for now)
        const existing = await db.select().from(notifications).where(eq(notifications.message, message));
        if (existing.length === 0) {
          await this.createNotification({
            type: 'alert',
            message: message
          });
        }
      }
    }
  }
}

export const storage = new DbStorage();