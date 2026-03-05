# FoodBridge - AI Smart Food Waste & Community Donation App

## Overview

FoodBridge is a full-featured Expo React Native mobile app that helps users track food expiry, reduce waste, get AI-powered recipe suggestions, and donate surplus food to the community.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js on port 5000
- **State**: React Context + AsyncStorage for persistence
- **Fonts**: Poppins (Google Fonts)
- **Navigation**: NativeTabs with liquid glass (iOS 26+), classic tabs fallback

## Key Features

1. **Home Dashboard** - Greeting, stats (food saved, CO₂, donations), expiry alerts, quick actions, recent activity
2. **Smart Pantry** - Color-coded expiry tracking, category/search filtering, swipe-delete
3. **AI Food Scanner** - Animated camera scanner with simulated AI recognition (2s delay, mock results)
4. **Recipe Suggestions** - Match pantry items to 5 hardcoded recipes with ingredient highlighting
5. **Donate & Find Food** - Post donations from expiring items, browse nearby food listings
6. **Notifications** - Smart expiry and donation alerts with read/unread state
7. **Profile** - Impact stats, donation history, settings (dark mode, notifications, location)
8. **Add Food** - Manual form entry with category, storage, date pickers

## Color Palette

- Primary Green: #2E7D32
- Accent Orange: #FF8F00
- Background: #FFFFFF
- Surface: #F1F8E9
- Dark bg: #0A1A0A

## File Structure

```
app/
  _layout.tsx           # Root layout with Poppins fonts + providers
  (tabs)/
    _layout.tsx         # Tab navigation (NativeTabs / Classic fallback)
    index.tsx           # Home dashboard
    pantry.tsx          # Smart pantry
    recipes.tsx         # Recipe suggestions
    donate.tsx          # Donate/find food
    profile.tsx         # Profile & settings
  scanner.tsx           # AI food scanner (modal)
  notifications.tsx     # Notifications (modal)
  add-food.tsx          # Add food item (modal)
context/
  AppContext.tsx         # Global state (pantry, donations, notifications, settings)
constants/
  colors.ts             # FoodBridge color palette
```

## Sample Data

Pre-loaded with 8 pantry items, 5 recipes, 3 nearby donations, 5 notifications.

## Workflows

- `Start Backend`: `npm run server:dev` (port 5000)
- `Start Frontend`: `npm run expo:dev` (port 8081)
