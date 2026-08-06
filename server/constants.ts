// Server configuration constants

// Timeouts
export const GEMINI_API_TIMEOUT_MS = 45_000; // 45 seconds
export const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
export const EXTENDED_TIMEOUT_MS = 60_000; // 60 seconds for AI endpoints
export const REQUEST_TIMEOUT_MS = 90_000; // 90 seconds for general API requests
export const AI_RETRY_DELAY_MS = 1_500; // Initial retry delay
export const AI_MAX_RETRIES = 3;

// Database
export const DB_CONNECTION_TIMEOUT_MS = 10_000;
export const DB_IDLE_TIMEOUT_MS = 30_000;
export const DB_MAX_CONNECTIONS = 10;

// Matching & Scoring
export const DISTANCE_SCORE_DECAY_PER_KM = 5; // Distance score drops by 5 per km
export const MAX_DISTANCE_KM = 20; // Distance at which score reaches 0
export const DEFAULT_DISTANCE_SCORE = 50; // Score when no location available
export const URGENCY_THRESHOLD_HOURS = 5; // Hours until expiry to trigger urgency boost
export const URGENCY_MULTIPLIER = 1.5; // Boost factor for urgent donations
export const CATEGORY_SCORE_HOUSEHOLD = 80;
export const CATEGORY_SCORE_PURE_RECEIVER = 90;
export const CATEGORY_SCORE_DEFAULT = 50;
export const ACTIVITY_SCORE_MAX = 20;
export const ACTIVITY_SCORE_FACTOR = 0.1;

// Matching weights
export const DISTANCE_WEIGHT = 0.5;
export const CATEGORY_WEIGHT = 0.3;
export const ACTIVITY_WEIGHT = 0.2;

// Radar & Filtering
export const RADAR_MAX_DISTANCE_KM = 5.0; // Maximum distance for radar results
export const PEER_REQUEST_MAX_AGE_HOURS = 24; // Peer requests expire after 24 hours

// Escalation windows (in hours)
export const ESCALATION_WINDOW_URGENT = 2; // Expiring within 24 hours
export const ESCALATION_WINDOW_SOON = 6; // Expiring within 48 hours
export const ESCALATION_WINDOW_DEFAULT = 12; // Far future
export const ESCALATION_WINDOW_NO_EXPIRY = 24; // No expiry set
export const MAX_ESCALATION_LEVEL = 4;

// OTP
export const OTP_MIN_VALUE = 1000;
export const OTP_MAX_VALUE = 9999;
export const OTP_LENGTH = 4;

// Pantry expiry notifications
export const EXPIRY_NOTIFICATION_DAYS_AHEAD = 2; // Notify 2 days before expiry

// Stats calculation (per unit)
export const STATS_MEALS_PER_UNIT = 1;
export const STATS_FOOD_SAVED_KG_PER_UNIT = 0.5;
export const STATS_CO2_KG_PER_UNIT = 1.2;

// Bulk donation defaults
export const BULK_DONATION_DEFAULT_WEIGHT_KG = 10;
export const BULK_DONATION_DEFAULT_CO2_KG = 25;
export const BULK_DONATION_DEFAULT_MEALS = 20;

// Community defaults
export const COMMUNITY_DEFAULT_MAX_MEMBERS = 100;
export const COMMUNITY_DEFAULT_TYPE = "Housing Society";
export const COMMUNITY_DEFAULT_JOIN_TYPE = "request";

// Item weight assumptions (in kg)
export const ITEM_WEIGHT_PER_PIECE_KG = 0.1;
export const ITEM_WEIGHT_PER_LOAF_KG = 0.5;
export const ITEM_WEIGHT_PER_PACK_KG = 0.4;
export const ITEM_WEIGHT_DEFAULT_KG = 0.2;

// CORS
export const CORS_ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
export const CORS_ALLOWED_HEADERS = "Content-Type";

// Pantry item weight conversion
export const GRAMS_TO_KG = 1000;
export const ML_TO_L = 1000;