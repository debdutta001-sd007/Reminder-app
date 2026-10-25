# Implementation Plan: Android Real-Time Live Wallpaper with Green Light Completed Tasks (COMPLETED)

Build an Android-exclusive live wallpaper ecosystem that updates in real-time anytime tasks change, featuring glowing green light indicators for completed tasks, subtle breathing glow on active dots, full-screen OLED Ambient Always-On Display (AOD), and dynamic vector lockscreen feed for Android OS automation.

## User Specifications & Clarification Decisions (Delivered)
1. **Live Updates Anytime**:
   - Both in-app Ambient AOD mode (standby desk dock clock) and dynamic phone lockscreen feed (Tasker / MacroDroid).
   - Instant real-time sync triggered on any task change + live clock ticks.
2. **Dot Color Hierarchy**:
   - 🔴 **Red** (`#EF4444`): Urgent / Hard tasks with subtle urgent breathing pulse.
   - 🟠 **Orange** (`#F97316`): Today's focus dot / High priority with warm breathing glow.
   - 🔵 **Blue** (`#3B82F6`): Normal priority / Easy tasks / Scheduled.
   - 🟢 **Green Light** (`#10B981` / `#34D399`): Completed tasks with a vibrant glowing green light dot, subtle strikethrough, and checkmark.
3. **Completed Tasks on Wallpaper**:
   - Display the 3 most recently completed tasks alongside active tasks with glowing green light beacons.

---

## Technical Architecture & Core Changes

### 1. Backend Wallpaper & Live Stream Engine (`server.ts`) - [DONE]
- **Green Light Completed Task Rendering**:
  - In `GET /api/wallpaper.svg`:
    - Renders the 3 most recently completed tasks with SVG filter `#glowGreen`, checkmark badge, and dimmed line-through text.
    - Embedded `@keyframes breathe` for active Red & Orange breathing dots.
- **Server-Sent Events (`GET /api/wallpaper/stream`)**:
  - Push live `wallpaper-update` events on any task mutation (`task:create`, `task:update`, `task:move`, `task:delete`, `task:subtask_toggle`, `/api/reset`) + 60s clock ticks.

### 2. In-App Android Ambient Live Wallpaper (`src/components/AmbientLiveWallpaper.tsx`) - [DONE]
- **Glowing Green Light Completed Section**:
  - Shows 3 most recent completed tasks with glowing emerald green dots (`bg-emerald-500 shadow-[0_0_12px_#10B981] ring-2 ring-emerald-500/40`), checkmark, and quick reopen button.
  - Active tasks feature Red/Orange breathing glow.
- **Screen Wake Lock API (`navigator.wakeLock`)**:
  - Automatic screen wake lock with status badge for Android dock/desk stand use.
- **OLED Burn-in Protection**:
  - Periodic $\pm 2\text{px}$ drift every 5 minutes to prevent OLED burn-in.

### 3. Wallpaper Studio & Android Automation Suite (`src/components/WallpaperStudio.tsx`) - [DONE]
- **Android Device Mockup**:
  - Renders active focus tasks with breathing dots + recent completed tasks with glowing green light dots.
- **High-Res 1080×2400 Canvas PNG Export**:
  - Canvas drawing with emerald shadow blur, checkmark glyph, and dimmed line-through text.
- **Android Auto-Sync Setup**:
  - Tasker, MacroDroid, and live stream options.

### 4. Kanban, List, & Matrix Views - [DONE]
- `TaskCard.tsx`: Completed tasks show glowing green light dot with checkmark, dimmed text.
- `ListView.tsx`: Priority column renders glowing green dot with "Completed" text for done items.
- `EisenhowerMatrix.tsx`: Completed section showcases green light indicator dots and checkmarks.

---

## Verification Results
- `lint_applet`: Passed with 0 errors.
- `compile_applet`: Passed.
- Endpoint validation: `curl /api/wallpaper.svg` verified SVG with `glowGreen`, `breathe-dot`, and completed tasks.
- Dev server: Restarted and verified active.
