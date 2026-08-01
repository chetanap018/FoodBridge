import { GoogleGenerativeAI } from "@google/generative-ai";
import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { calculateMatchScores, getEscalationWindowHours } from "./matching-engine";

export async function registerRoutes(app: Express): Promise<Server> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  async function generateContentWithRetry(contents: any, retries = 3, delayMs = 1500): Promise<any> {
    let lastError: any;
    const models = ["gemini-2.5-flash"];
    
    for (const modelName of models) {
      const model = genAI.getGenerativeModel({ model: modelName });
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`Calling Gemini API using model ${modelName} (attempt ${i + 1}/${retries})...`);
          return await model.generateContent(contents);
        } catch (err: any) {
          lastError = err;
          const status = err.status || (err.message && (err.message.includes("503") || err.message.includes("429")));
          if (status && i < retries - 1) {
            console.warn(`Gemini API returned status ${status || 'transient error'}. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2; // exponential backoff
            continue;
          }
          break; // Try next model or bubble error
        }
      }
    }
    throw lastError;
  }

  // ── Auth Sync ────────────────────────────────────────
  app.post("/api/auth/sync", async (req: Request, res: Response) => {
    try {
      const { id, email, name, role, userCategory, entityType, buildingName, avatar } = req.body;
      if (!id || !email) return res.status(400).json({ error: "id and email are required" });
      const user = await storage.upsertUser({ 
        id, 
        email, 
        name: name ?? null, 
        role: role ?? "Donor", 
        userCategory: userCategory ?? "Household",
        entityType: entityType ?? null,
        buildingName: buildingName ?? null,
        avatar: avatar ?? null 
      });
      return res.status(200).json(user);
    } catch (err: any) {
      console.error("Auth sync error:", err);
      return res.status(500).json({ error: err.message || "Sync failed" });
    }
  });

  // ── Profile Update ───────────────────────────────────
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id as string);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.status(200).json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { name, role, userCategory, entityType, buildingName, avatar, foodSaved, donationsMade, co2Reduced, mealsProvided } = req.body;
      const user = await storage.updateUser(req.params.id as string, {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(userCategory !== undefined && { userCategory }),
        ...(entityType !== undefined && { entityType }),
        ...(buildingName !== undefined && { buildingName }),
        ...(avatar !== undefined && { avatar }),
        ...(foodSaved !== undefined && { foodSaved }),
        ...(donationsMade !== undefined && { donationsMade }),
        ...(co2Reduced !== undefined && { co2Reduced }),
        ...(mealsProvided !== undefined && { mealsProvided }),
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.status(200).json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Pantry ──────────────────────────────────────────
  app.get("/api/pantry", async (req: Request, res: Response) => {
    try {
      const userId = (req.query.userId as string) as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const items = await storage.getPantryItems(userId);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/pantry", async (req: Request, res: Response) => {
    try {
      const item = await storage.addPantryItem(req.body);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/pantry/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.query.userId as string) as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const deleted = await storage.removePantryItem(req.params.id as string, userId);
      if (!deleted) return res.status(404).json({ error: "Item not found" });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Bulk migrate AsyncStorage items to DB
  app.post("/api/pantry/migrate", async (req: Request, res: Response) => {
    try {
      const { userId, items } = req.body;
      if (!userId || !Array.isArray(items)) {
        return res.status(400).json({ error: "userId and items array required" });
      }
      console.log(`Migrating ${items.length} items for user ${userId}`);
      const itemsWithUserId = items.map((item: any) => ({ ...item, userId }));
      await storage.migratePantryItems(itemsWithUserId);
      return res.json({ success: true, count: items.length });
    } catch (err: any) {
      console.error("Migration error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Donations ────────────────────────────────────────
  
  // Helper for Haversine distance
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Radar endpoint for finding food
  app.get("/api/donations/radar", async (req: Request, res: Response) => {
    try {
      const userId = (req.query.userId as string) as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const activeDonations = await storage.getActiveDonations();
      const userCommunities = await storage.getUserCommunities(userId);
      const communityIds = new Set(userCommunities.map(c => c.id));

      const radarDonations = activeDonations.filter(d => {
        // Exclude expired donations
        if (d.expiryTime && new Date(d.expiryTime).getTime() < Date.now()) return false;

        // Exclude user's own donations
        if (d.userId === userId) return false;

        // If donation has a communityId, check if user is in it
        if (d.communityId) {
          return communityIds.has(d.communityId);
        }

        // Global/Bulk donation
        if (!d.communityId) {
          // Pure Receivers see global bulk donations
          if (user.userCategory === 'Pure Receiver' || user.userCategory === 'NGO') return true;
          // Households and normal users should NOT see global bulk donations in the radar feed
          return false;
        }

        return false;
      });

      // Filter by 5km radius and map donor to attach to payload later
      const userCache = new Map<string, any>();
      for (const d of radarDonations) {
        if (!userCache.has(d.userId)) {
          const donor = await storage.getUser(d.userId);
          userCache.set(d.userId, donor);
        }
      }

      const formatted = radarDonations.map(d => {
        const donor = userCache.get(d.userId);
        
        // Calculate real distance if lat/lng available, otherwise default to 0 for demo/backwards compatibility
        let distanceKm = 0;
        if (user.latitude && user.longitude && donor?.latitude && donor?.longitude) {
           distanceKm = calculateDistance(user.latitude, user.longitude, donor.latitude, donor.longitude);
        }

        return {
          id: d.id,
          donorName: donor?.name || donor?.buildingName || 'A Generous Donor',
          title: d.title,
          foodCategory: d.foodCategory,
          quantity: d.quantity,
          unit: d.unit,
          distance: distanceKm === 0 ? 'Nearby' : `${distanceKm.toFixed(1)} km`,
          distanceKm,
          type: 'mixed',
          postedAt: new Date(d.postedAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          available: d.status === 'active'
        };
      }).filter(d => d.distanceKm <= 5.0); // Strict 5km global boundary filter

      res.json(formatted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/donations", async (req: Request, res: Response) => {
    try {
      const userId = (req.query.userId as string) as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const donations = await storage.getDonations(userId);
      res.json(donations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/donations", async (req: Request, res: Response) => {
    try {
      const { userId, communityId, title, foodCategory, quantity, unit, visibility, metadata, aiAnalysis, images, latitude, longitude, expiryTime } = req.body;
      if (!userId || !title) {
        return res.status(400).json({ error: "userId and title required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const isPureDonor = ['Pure Donor', 'Hotel', 'Restaurant', 'Supermarket', 'Grocery Store', 'Catering Service'].includes(user.userCategory || '');
      const isPublic = visibility === 'public' || visibility === 'community_first';
      
      let finalCommunityId = communityId ?? null;
      let escalationLevel = 1; // start at community level

      // Bulk Global Donations Bypass Community Match
      if (isPureDonor && isPublic) {
        finalCommunityId = null;
        escalationLevel = 3; // Global/NGO level
      }

      const parsedExpiryTime = expiryTime ? new Date(expiryTime) : null;
      
      const donation = await storage.addDonation({
        userId,
        communityId: finalCommunityId,
        title,
        foodCategory: foodCategory || "Other",
        quantity: quantity || "1",
        unit: unit || "pcs",
        visibility: visibility || "community_first",
        metadata: metadata || null,
        aiAnalysis: aiAnalysis || null,
        images: images || null,
        status: 'active',
        escalationLevel,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        expiryTime: parsedExpiryTime,
      });
      res.status(201).json(donation);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/donations/analyze-and-create", async (req: Request, res: Response) => {
    try {
      const { 
        userId, communityId, title, foodCategory, quantity, unit, visibility, metadata, imagesBase64, latitude, longitude, expiryTime 
      } = req.body;

      if (!userId || !title) {
        return res.status(400).json({ error: "userId and title required" });
      }

      let aiAnalysis = null;
      if (imagesBase64 && imagesBase64.length > 0) {
        // Attempt AI analysis if image provided
        const img = imagesBase64[0].replace(/^data:image\/\w+;base64,/, "");
        const prompt = `Analyze this food donation image. The user claims to be donating: ${title}, Quantity: ${quantity} ${unit}.
        Provide a JSON object (no markdown) with these keys:
        - freshnessScore: number 0-100
        - safetyScore: number 0-100
        - estimatedMeals: number
        - estimatedCo2SavedKg: number
        - urgencyLevel: string ("Low", "Medium", "High", "Critical")
        - shelfLifeRemainingDays: number
        - recommendedReceiver: string ("Anyone", "Families", "NGOs", "Community Kitchens")
        - priorityScore: number 0-100
        Make realistic estimates based on the visual appearance of the food or standard shelf life data if visual is unclear.`;

        try {
           const result = await generateContentWithRetry([
             { inlineData: { mimeType: "image/jpeg", data: img } },
             prompt
           ]);
           const text = result.response.text();
           const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
           aiAnalysis = JSON.parse(cleaned);
        } catch (e) {
           console.error("AI Analysis failed, saving without AI scores", e);
        }
      }

      const escalationLevel = 1;
      const parsedExpiryTime = expiryTime ? new Date(expiryTime) : null;

      const donation = await storage.addDonation({
        userId,
        communityId: communityId ?? null,
        title,
        foodCategory: foodCategory || "Other",
        quantity: quantity || "1",
        unit: unit || "pcs",
        visibility: visibility || "community_first",
        metadata: metadata || null,
        aiAnalysis: aiAnalysis,
        images: null, // Normally we would upload images to bucket and store URLs. Skipping for now or storing base64.
        status: 'active',
        escalationLevel,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        expiryTime: parsedExpiryTime,
      });

      res.status(201).json(donation);
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  });

  // Get matching scores for a donation
  app.get("/api/donations/:id/matches", async (req: Request, res: Response) => {
    try {
      const donationId = req.params.id;
      // Fetch donation (In real app, we would add getDonationById)
      // For now, let's just get active donations and find it
      const activeDonations = await storage.getActiveDonations();
      const donation = activeDonations.find(d => d.id === donationId);
      
      if (!donation) return res.status(404).json({ error: "Donation not found" });

      let potentialReceivers: any[] = [];
      if (donation.communityId) {
         potentialReceivers = await storage.getUsersByCommunity(donation.communityId);
      } else {
         // Global donation (Bulk from Pure Donors).
         // Ideally, fetch all "Pure Receivers" in the system or nearby.
         // Since we don't have a getAllUsers with filters, we will just fetch community users for now as a fallback,
         // but in reality we would do:
         // potentialReceivers = await storage.getUsersByCategory('Pure Receiver');
         potentialReceivers = []; // Need to add getAllUsers to storage if we want this fully fleshed out
      }

      const matches = calculateMatchScores(donation, potentialReceivers);
      return res.json(matches);

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Escalation Worker Endpoint (would be called by cron) ──
  app.post("/api/donations/escalate", async (req: Request, res: Response) => {
    try {
      const activeDonations = await storage.getActiveDonations();
      let escalatedCount = 0;
      const now = new Date();

      for (const donation of activeDonations) {
        const windowHours = getEscalationWindowHours(donation.expiryTime);
        const hoursActive = (now.getTime() - new Date(donation.postedAt * 1000).getTime()) / (1000 * 60 * 60);

        // If time active exceeds the window, escalate to the next tier
        if (hoursActive >= windowHours && donation.escalationLevel < 4) {
          await storage.updateDonationStatus(donation.id, 'active', donation.escalationLevel + 1);
          escalatedCount++;
          // In a real app: Send notifications to the new tier (Priority 2, 3, etc.)
        } else if (donation.expiryTime && new Date(donation.expiryTime) < now) {
          // Expired
          await storage.updateDonationStatus(donation.id, 'expired');
        }
      }
      res.json({ success: true, escalatedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Peer Requests ────────────────────────────────────
  app.get("/api/peer-requests/radar", async (req: Request, res: Response) => {
    try {
      const reqs = await storage.getPeerRequests(null);
      const now = new Date();
      const validReqs = reqs.filter(r => {
        const ageHours = (now.getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
        return ageHours < 24 && r.status === 'active';
      });
      res.json(validReqs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/peer-requests/:communityId", async (req: Request, res: Response) => {
    try {
      const communityId = (req.query.communityId as string) as string;
      const reqs = await storage.getPeerRequests(communityId);
      const now = new Date();
      const validReqs = reqs.filter(r => {
        const ageHours = (now.getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
        return ageHours < 24 && r.status === 'active';
      });
      res.json(validReqs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/peer-requests", async (req: Request, res: Response) => {
    try {
      const peerReq = await storage.addPeerRequest(req.body);
      res.status(201).json(peerReq);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/peer-request/:id", async (req: Request, res: Response) => {
    try {
      const peerReq = await storage.getPeerRequest(req.params.id as string);
      if (!peerReq) {
        return res.status(404).json({ error: "Request not found" });
      }
      // fetch user and community details
      const user = await storage.getUser(peerReq.userId);
      let community = null;
      if (peerReq.communityId) {
        community = await storage.getCommunity(peerReq.communityId);
      }
      res.json({ peerRequest: peerReq, donor: user, community });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Communities ──────────────────────────────────────
  app.get("/api/communities", async (_req: Request, res: Response) => {
    try {
      const communities = await storage.listCommunities();
      res.json(communities);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community", async (req: Request, res: Response) => {
    try {
      const { name, type, maxMembers, address, joinType, adminId } = req.body;
      if (!name || !adminId) return res.status(400).json({ error: "Name and adminId are required" });

      const community = await storage.createCommunity({
        name,
        type: type || "Housing Society",
        maxMembers: maxMembers ? parseInt(maxMembers) : 100,
        address: address || "",
        joinType: joinType || "request",
        adminId
      });

      // Automatically add creator as admin
      await storage.addCommunityMember({
        userId: adminId,
        communityId: community.id,
        role: "admin"
      });

      res.status(201).json(community);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users/:userId/communities", async (req: Request, res: Response) => {
    try {
      const communities = await storage.getUserCommunities(req.params.userId as string);
      res.json(communities);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/community/:id/leave", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      
      const result = await storage.leaveCommunity(userId, req.params.id as string);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/:id/join", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const communityId = req.params.id;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const community = await storage.getCommunity(communityId as string);
      if (!community) return res.status(404).json({ error: "Community not found" });

      if (community.joinType === 'open') {
        // join immediately
        await storage.addCommunityMember({
          userId,
          communityId: communityId as string,
          role: "member"
        });
        return res.json({ success: true, status: 'joined' });
      } else {
        // create request
        const request = await storage.createJoinRequest({
          userId,
          communityId: communityId as string,
          status: 'pending'
        });
        return res.json({ success: true, status: 'pending', request });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/:id/requests", async (req: Request, res: Response) => {
    try {
      const requests = await storage.getCommunityJoinRequests(req.params.id as string);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/community/requests/:reqId", async (req: Request, res: Response) => {
    try {
      const { status } = req.body; // 'approved' or 'rejected'
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const request = await storage.updateJoinRequestStatus(req.params.reqId as string, status);
      if (!request) return res.status(404).json({ error: "Request not found" });

      if (status === 'approved') {
        await storage.addCommunityMember({
          userId: request.userId,
          communityId: request.communityId,
          role: "member"
        });
      }

      res.json({ success: true, request });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/:id/leaderboard", async (req: Request, res: Response) => {
    try {
      const communityId = req.params.id as string;
      const users = await storage.getCommunityMembers(communityId);
      // Sort by donationsMade descending
      const leaderboard = users.sort((a, b) => (b.donationsMade || 0) - (a.donationsMade || 0));
      res.json(leaderboard);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Notifications ────────────────────────────────────
  app.get("/api/notifications", async (_req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id);
      if (!success) return res.status(404).json({ error: "Notification not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/notifications/clear-all", async (_req, res) => {
    try {
      await storage.clearAllNotifications();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Matches ──────────────────────────────────────────

  app.get("/api/donations/:donationId/matches", async (req: Request, res: Response) => {
    try {
      const matches = await storage.getMatchesForDonation(req.params.donationId as string);
      res.json(matches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/matches/:donationId/accept", async (req: Request, res: Response) => {
    try {
      const donationId = req.params.donationId as string;
      const { receiverId, peerRequestId } = req.body;
      
      if (!receiverId) return res.status(400).json({ error: "receiverId is required" });

      const result = await storage.acceptDonation(donationId, receiverId, peerRequestId);
      if (!result.success) {
        return res.status(409).json({ error: result.error }); // Conflict if already reserved
      }

      res.status(201).json({ match: result.match, otp: result.otp });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/matches/:matchId/verify", async (req: Request, res: Response) => {
    try {
      const matchId = req.params.matchId as string;
      const { otp } = req.body;
      
      if (!otp) return res.status(400).json({ error: "otp is required" });

      const result = await storage.verifyMatch(matchId, otp);
      if (!result.success) {
        return res.status(400).json({ error: result.error }); // Invalid OTP or match state
      }

      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── AI Scanner ───────────────────────────────────────
  app.post("/api/scan", async (req, res) => {
    try {
      let { imageBase64, mediaType = "image/jpeg" } = req.body;
      if (!imageBase64) return res.status(400).json({ error: "No image provided" });

      // Strip data URI prefix if present
      imageBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const result = await generateContentWithRetry([
        { inlineData: { mimeType: mediaType, data: imageBase64 } },
        `Identify the food item in this image and respond ONLY with a JSON object, no markdown, no explanation. Use this exact format:
{
  "name": "Food name",
  "category": "one of: Fruits, Vegetables, Dairy, Grains, Protein, Beverages, Other",
  "shelfLifeDays": number,
  "confidence": number between 0-100,
  "storageLocation": "one of: Fridge, Freezer, Pantry, Counter",
  "unit": "one of: g, kg, ml, L, pcs, loaf, pack, box, can, bottle"
}
If you cannot identify a food item, respond with: {"error": "No food item detected"}`,
      ]);

      const text = result.response.text();
      const cleaned = text.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.error) return res.status(422).json(parsed);
        return res.json(parsed);
      } catch {
        console.error("AI response parse error:", text);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      return res.status(500).json({ error: err.message || "Scan failed" });
    }
  });

  app.post("/api/scan-receipt", async (req, res) => {
    try {
      let { imageBase64, mediaType = "image/jpeg" } = req.body;
      if (!imageBase64) return res.status(400).json({ error: "No image provided" });

      // Strip data URI prefix if present
      imageBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const result = await generateContentWithRetry([
        { inlineData: { mimeType: mediaType, data: imageBase64 } },
        `Analyze this receipt and extract all food items (specifically fruits and vegetables, but include others too). 
        Identify the name, quantity (extract numeric value if possible), and the purchase date from the receipt. 
        If the purchase date is not found, use today's date: ${new Date().toISOString().split('T')[0]}.
        Respond ONLY with a JSON object containing an "items" array, no markdown, no explanation. Use this exact format:
{
  "items": [
    {
      "name": "Food item name",
      "quantity": "quantity value (e.g. 500, 2, 1)",
      "unit": "one of: g, kg, ml, L, pcs, loaf, pack, box, can, bottle",
      "category": "one of: Fruits, Vegetables, Dairy, Grains, Protein, Beverages, Other",
      "purchaseDate": "YYYY-MM-DD",
      "shelfLifeDays": number (estimated days from purchase date),
      "storageLocation": "one of: Fridge, Freezer, Pantry, Counter"
    }
  ]
}
If no items are found, respond with: {"items": []}`,
      ]);

      const text = result.response.text();
      const cleaned = text.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        return res.json(parsed);
      } catch {
        console.error("AI receipt response parse error:", text);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }
    } catch (err: any) {
      console.error("Receipt scan error:", err);
      return res.status(500).json({ error: err.message || "Scan failed" });
    }
  });

  app.post("/api/recipes/suggest", async (req, res) => {
    try {
      const { urgentIngredients = [], normalIngredients = [] } = req.body;
      const allIngredients = [...urgentIngredients, ...normalIngredients];
      
      if (allIngredients.length === 0) {
        return res.status(400).json({ error: "No ingredients provided" });
      }

      const prompt = `Suggest 3 creative recipes based on these ingredients:
      Urgent (Expiring soon): ${urgentIngredients.join(", ")}
      Other ingredients: ${normalIngredients.join(", ")}

      CRITICAL REQUIREMENTS:
      1. Majority of recipes (at least 2 out of 3) must be Indian foods (e.g. Curries, Sabzi, Pulao, Paratha, etc.).
      2. The TOP priority recipe (first one in "recipes" array) MUST include at least one of the "Urgent" ingredients to avoid waste.
      3. Respond ONLY with a JSON object containing a "recipes" array. Each recipe must have this exact structure:
{
  "recipes": [
    {
      "id": "unique_string_id",
      "name": "Recipe Name",
      "ingredients": ["Item from pantry used", "Another item"],
      "missingIngredients": ["Small item not in pantry already", "Common spices"],
      "cookTime": "e.g. 25 min",
      "difficulty": "Easy", "Medium", or "Hard",
      "matchScore": number 0-100 (percentage of ingredients matched from pantry),
      "emoji": "one food emoji describing the dish",
      "description": "Short appetizing description",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "filter": ["Quick Meals", "Zero Waste", "Healthy"] (at least one)
    }
  ]
}
No markdown, no explanation. Just the JSON object.`;

      const result = await generateContentWithRetry(prompt);
      const text = result.response.text();
      const cleaned = text.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
      
      try {
        const parsed = JSON.parse(cleaned);
        return res.json(parsed);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }
    } catch (err: any) {
      console.error("Recipe generation error:", err);
      return res.status(500).json({ error: err.message || "Recipe generation failed" });
    }
  });

  return createServer(app);
}