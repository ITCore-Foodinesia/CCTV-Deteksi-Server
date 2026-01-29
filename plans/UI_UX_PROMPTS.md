# 🎨 UI/UX Design Prompts for "Gudang Driver" App

This document contains specialized prompts generated from `DRIVER_ANDROID_APP_DESIGN.md`. use these with various AI tools to generate assets and code.

---

## 🖼️ 1. Image Generation Prompts (Midjourney / DALL-E 3 / Stable Diffusion)

Use these to generate visual inspiration and high-fidelity mockups.

### 🟢 1.1 General Style & Theme

> **Prompt:**
> Mobile app UI design, Material Design 3 system, Android 14 style, warehouse logistics theme, "Gudang Driver" app. Primary color Lime Green (#84cc16), Secondary Emerald Green, clean white surface, soft shadows, rounded corners (28dp). minimalistic, high contrast, accessible, Figma, Dribbble trending, 8k resolution --ar 9:19 --v 6.0

### 🟢 1.2 Login Screen

> **Prompt:**
> Android app login screen UI, "Gudang Driver", professional truck driver application. Minimalist form with phone number input, large Lime Green (#84cc16) "MASUK" filled button. Header with truck logo. Clean white background, modern typography (Roboto/Inter). Bottom link "Daftar Akun". High fidelity mobile UI --ar 9:19

### 🟢 1.3 Home Screen (Idle State)

> **Prompt:**
> Android app home dashboard UI, truck driver interface. Top card with driver profile info. Center Hero section: Large "TIDAK ADA LOADING" status, giant "MULAI LOADING" Floating Action Button (FAB) in Lime Green (#84cc16) with play icon. Quick action chips below. Material You style, clean, intuitive, large touch targets --ar 9:19

### 🟢 1.4 Home Screen (Active Loading State)

> **Prompt:**
> Android app home screen UI, active loading state. Large pulsing Emerald Green card showing "SEDANG LOADING", digital timer "00:45:12", truck plate number "KT 9900 PQ". "SELESAI LOADING" button in red/rose color. Progress indicator. Warehouse dock information. Modern, urgent but clean interface --ar 9:19

### 🟢 1.5 Loading History List

> **Prompt:**
> Android app list view UI, transaction history. Vertical list of cards, each showing date, truck plate, and status badge (Green for Success, Red for Cancelled). Clean separation, subtle elevation, filter chips at top (Date, Status). Material Design 3 list styling --ar 9:19

---

## 💻 2. UI Code Generation Prompt (v0.dev / Galileo / Claude)

Copy and paste this entire block into **v0.dev**, **Galileo AI**, or **Claude 3.5 Sonnet** to generate the actual UI components/code.

```text
Act as a Senior UI/UX Designer and Frontend Engineer.
Design a cohesive mobile app interface for "Gudang Driver", a logistics app for truck drivers.
Use Framework: React Native (or React Web/PWA) with Tailwind CSS.
Design System: Material Design 3 (Material You).

## 🎨 Color Palette
- Primary: #84cc16 (Lime-500)
- Secondary: #10b981 (Emerald-500)
- Error: #f43f5e (Rose-500)
- Background: #f9fafb (Gray-50)
- Surface: #ffffff (White)
- Text: #111827 (Gray-900)

## 📱 Core Screens Needed

1. **Login Page**:
   - Clean, centered card.
   - Input: Phone Number (with +62 prefix).
   - Input: Password (with visibility toggle).
   - "Remember Me" checkbox.
   - Large Primary Button: "MASUK".
   - Link: "Lupa kata sandi?" and "Belum punya akun? Daftar".

2. **Home Dashboard (State: IDLE)**:
   - Header: "Gudang Driver" + User Avatar.
   - Driver Info Card: Name, Phone, Plate Number (Gray-100 bg).
   - Hero Section: Large empty state illustration.
   - Action: Giant Circular FAB or wide button "MULAI LOADING" (Primary Color, Play Icon).
   - Bottom Row: "Riwayat", "Bantuan".

3. **Home Dashboard (State: LOADING)**:
   - Status Card: "SEDANG LOADING" (Pulsing Emerald bg).
   - Timer: Large digital clock hh:mm:ss.
   - Details: Dock Location, Current Time.
   - Action: "SELESAI LOADING" Button (Error/Rose Color, Stop Icon).

4. **Confirmation Modal**:
   - Bottom Sheet style.
   - Title: "Konfirmasi Selesai?".
   - Details: Summary of duration.
   - Buttons: "Batal" (Ghost) vs "Ya, Selesai" (Rose Filled).

## 📐 Design Requirements
- Use large touch targets (min 48px) for drivers.
- Rounded corners: 28px for buttons, 16px for cards.
- Font: Inter or Roboto.
- Shadows: Soft, md/lg elevation for cards.
- Layout: Mobile-first, flexbox columns.

Generate the UI now, focusing on the Home Dashboard switching between IDLE and LOADING states.
```

---

## 🖌️ 3. Icon Asset Manifest

If asking an icon generator (like Midjourney or IconReview):

> **Prompt:**
> App icon for "Gudang Driver", logistics truck application. Concept: Combination of a minimalistic truck front and a warehouse box/check mark. Primary color Lime Green (#84cc16). White background, rounded square shape (squircle), flat vector style, material design shadows. --v 6.0
