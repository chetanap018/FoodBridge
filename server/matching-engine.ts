import { type Donation, type User } from "@shared/schema";
import { 
  DISTANCE_SCORE_DECAY_PER_KM, 
  MAX_DISTANCE_KM, 
  DEFAULT_DISTANCE_SCORE,
  URGENCY_THRESHOLD_HOURS,
  URGENCY_MULTIPLIER,
  CATEGORY_SCORE_HOUSEHOLD,
  CATEGORY_SCORE_PURE_RECEIVER,
  CATEGORY_SCORE_DEFAULT,
  ACTIVITY_SCORE_MAX,
  ACTIVITY_SCORE_FACTOR,
  DISTANCE_WEIGHT,
  CATEGORY_WEIGHT,
  ACTIVITY_WEIGHT,
  ESCALATION_WINDOW_URGENT,
  ESCALATION_WINDOW_SOON,
  ESCALATION_WINDOW_NO_EXPIRY,
} from "./constants";

// Haversine formula to calculate distance between two lat/lng coordinates in kilometers
export function calculateDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface MatchResult {
  user: User;
  score: number;
  distanceKm: number | null;
}

/**
 * AI Smart Matching Engine - Heuristic Algorithm
 * 
 * Calculates a Priority Score (0-100%) for potential receivers based on:
 * - Distance (closer is better)
 * - Expiry time (urgent items need fast matches)
 * - Receiver type (Households, NGOs)
 */
export function calculateMatchScores(donation: Donation, potentialReceivers: User[]): MatchResult[] {
  const now = new Date();
  
  // Calculate time until expiry in hours
  let hoursUntilExpiry = 24; // default if no expiry set
  if (donation.expiryTime) {
    const diffMs = new Date(donation.expiryTime).getTime() - now.getTime();
    hoursUntilExpiry = Math.max(0.1, diffMs / (1000 * 60 * 60)); // minimum 0.1 hour
  }

  const results: MatchResult[] = [];

  for (const receiver of potentialReceivers) {
    // Skip if receiver is a Pure Donor
    if (receiver.userCategory === 'Pure Donor') continue;
    // Skip if it's the donor themselves
    if (receiver.id === donation.userId) continue;

    let distanceKm: number | null = null;
    let distanceScore = 50; // Default score if no location

    // 1. Distance Calculation
    if (donation.latitude && donation.longitude && receiver.latitude && receiver.longitude) {
      distanceKm = calculateDistanceKM(donation.latitude, donation.longitude, receiver.latitude, receiver.longitude);
    // Distance score: 100 if 0km away, drops to 0 at max distance
    distanceScore = Math.max(0, 100 - (distanceKm * DISTANCE_SCORE_DECAY_PER_KM));
    }

    // 2. Expiry & Urgency Factor
    // If it expires in < threshold hours, closer distance matters MORE.
    let urgencyFactor = 1.0;
    if (hoursUntilExpiry < URGENCY_THRESHOLD_HOURS) {
      urgencyFactor = URGENCY_MULTIPLIER; // Boost closer matches
    }

    // 3. Category matching (e.g. NGOs might be better for large quantities, but for now we just weight them)
    let categoryScore = CATEGORY_SCORE_DEFAULT;
    if (receiver.userCategory === 'Household') categoryScore = CATEGORY_SCORE_HOUSEHOLD;
    if (receiver.userCategory === 'Pure Receiver') categoryScore = CATEGORY_SCORE_PURE_RECEIVER; // Dedicated NGOs/Banks

    // 4. Activity Factor (past acceptance history could be calculated from foodSaved)
    // Small boost for active users
    let activityScore = Math.min(ACTIVITY_SCORE_MAX, (receiver.foodSaved || 0) * ACTIVITY_SCORE_FACTOR);

    // Final Weighted Heuristic
    let finalScore = (distanceScore * DISTANCE_WEIGHT * urgencyFactor) + (categoryScore * CATEGORY_WEIGHT) + activityScore;
    
    // Normalize to 0-100
    finalScore = Math.min(100, Math.max(0, finalScore));

    results.push({
      user: receiver,
      score: Math.round(finalScore),
      distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
    });
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Calculates the dynamic escalation window (hours) based on expiry time.
 * e.g., 1 day expiry -> 2 hours window
 *       2 days expiry -> 6 hours window
 */
export function getEscalationWindowHours(expiryTime: Date | null): number {
  if (!expiryTime) return 24; // default window if no expiry
  
  const now = new Date();
  const diffHours = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 24) {
    return ESCALATION_WINDOW_URGENT; // Expiring today -> 2 hours window
  } else if (diffHours <= 48) {
    return ESCALATION_WINDOW_SOON; // Expiring tomorrow -> 6 hours window
  } else {
    return ESCALATION_WINDOW_NO_EXPIRY; // Far future -> 12 hours window
  }
}
