# 🎨 Design Prompt: Auth Pages for Warehouse AI Monitor

Use this prompt to request an AI to design **Landing Page, Login, Sign Up, and Forgot Password** pages.

---

## 📋 COPY THIS PROMPT ⬇️

```
Design a complete set of authentication pages (Landing Page, Login, Sign Up, and Forgot Password) for a **Warehouse AI CCTV Monitoring System** called "Gudang AI Monitor".

---

## 🏢 PROJECT CONTEXT

**Product Name:** Gudang AI Monitor (Warehouse AI Monitor)
**Industry:** Warehouse / Logistics / Supply Chain
**Target Users:**
- Warehouse Managers
- Logistics Operators
- Security Personnel
- Fleet Supervisors

**Core Features to Highlight:**
1. 🎥 **Live CCTV Streaming** - Real-time video feed with low latency
2. 🤖 **AI Object Detection** - YOLOv8-powered detection of trucks, persons, boxes/pallets
3. 📊 **Real-time Analytics** - Inbound/Outbound counts, truck activity, capacity tracking
4. 📝 **Activity Logging** - Live transaction logs with driver info and vehicle plates
5. 📱 **Multi-platform** - Web dashboard + Telegram bot control
6. 📈 **Google Sheets Integration** - Automatic inventory logging
7. 🔔 **Smart Alerts** - Telegram notifications for events

---

## 🎨 DESIGN SYSTEM (MUST FOLLOW)

### Color Palette:
- **Background:** `#F5F7F2` (soft green-gray, earthy tone)
- **Primary Accent:** Lime-400 `#a3e635` (bright lime green)
- **Secondary Colors:**
  - Emerald for success/inbound: `#10b981`
  - Rose for alerts/outbound: `#f43f5e`
  - Blue for info/trucks: `#3b82f6`
  - Amber for warnings/capacity: `#f59e0b`
- **Text:** Gray-800 `#1f2937` (primary), Gray-500 `#6b7280` (secondary)
- **Cards:** White with 60% opacity `rgba(255,255,255,0.6)`

### Visual Style:
- **Glass Morphism** - Frosted glass cards with `backdrop-blur`
- **Soft Shadows** - `shadow-lg` with colored accent shadows (e.g., `shadow-lime-300/50`)
- **Rounded Corners** - Large radius (`rounded-2xl`, `rounded-3xl`)
- **Modern Sans-serif** - System UI font stack
- **Subtle Borders** - White overlay borders (`border-white/60`)
- **Animated Elements** - Pulse animations for live indicators

### Logo Concept:
- Square/rounded icon with lime-400 background
- Video camera icon (📹) in white
- Clean, minimal, professional

---

## 📄 PAGE REQUIREMENTS

### 1. LANDING PAGE
**Purpose:** Attract potential customers, explain product value, drive sign-ups

**Required Sections:**
- **Hero Section:**
  - Catchy headline about AI-powered warehouse monitoring
  - Subheadline emphasizing real-time detection & analytics
  - CTA buttons: "Get Started Free" (primary) and "Watch Demo" (secondary)
  - Hero image/illustration: CCTV dashboard preview or warehouse with AI detection overlay

- **Features Section:**
  - Grid of 4-6 feature cards with icons
  - Features: Live Streaming, AI Detection, Real-time Stats, Activity Logs, Telegram Bot, Sheets Integration

- **How It Works Section:**
  - 3-step process: Connect Camera → AI Analyzes → Get Insights
  - Visual timeline or numbered cards

- **Stats/Social Proof Section:**
  - Metrics like "10,000+ Detections/Day", "99.9% Uptime", "50+ Warehouses"
  - Or testimonial cards from warehouse managers

- **CTA Section:**
  - Final call-to-action before footer
  - "Start Monitoring Your Warehouse Today"

- **Footer:**
  - Links: About, Features, Pricing, Contact, Privacy, Terms
  - Social icons
  - Copyright

**Mobile Considerations:**
- Hamburger menu for navigation
- Stacked layout for feature cards
- Touch-friendly CTA buttons

---

### 2. LOGIN PAGE
**Purpose:** Secure, quick access for existing users

**Required Elements:**
- Logo + Product name at top
- Welcome back message
- Form fields:
  - Email (with email icon)
  - Password (with eye toggle for show/hide)
- "Remember me" checkbox
- "Forgot password?" link
- Primary login button (lime-400 background)
- Divider with "or"
- Social login options (Google, optional: Microsoft)
- "Don't have an account? Sign up" link

**Visual Style:**
- Centered card on soft background
- Glass morphism card effect
- Illustration or CCTV-themed graphic on one side (for larger screens)
- Split layout: Left = visual, Right = form (on desktop)

---

### 3. SIGN UP PAGE
**Purpose:** Convert visitors to users with minimal friction

**Required Elements:**
- Logo + Product name
- "Create your account" heading
- Form fields:
  - Full Name
  - Email
  - Company/Warehouse Name (optional)
  - Password (with strength indicator)
  - Confirm Password
- Terms & Privacy checkbox: "I agree to the Terms of Service and Privacy Policy"
- Primary sign up button
- Divider with "or"
- Social sign up (Google)
- "Already have an account? Login" link

**Visual Style:**
- Same split layout as login
- Progress indicator if multi-step (optional)
- Inline validation with green checkmarks

---

### 4. FORGOT PASSWORD PAGE
**Purpose:** Help users recover access securely

**Required Elements:**
- Logo + Product name
- "Reset your password" heading
- Explanation text: "Enter your email and we'll send you a reset link"
- Email input field
- "Send Reset Link" button
- "Back to Login" link
- Success state: "Check your email! We've sent a password reset link to [email]"

**Visual Style:**
- Simpler, single-purpose layout
- Centered card
- Lock or email icon illustration

---

## 🖼️ VISUAL REFERENCES

The existing dashboard uses:
- Soft green-gray background (#F5F7F2)
- Lime-400 accent for primary actions
- Glass morphism cards with white/60% opacity
- Lucide React icons
- Status indicators with colored dots + pulse animation
- Grid layouts with responsive breakpoints

---

## 📱 RESPONSIVE REQUIREMENTS

- **Desktop (1280px+):** Split layout with illustration + form
- **Tablet (768px-1279px):** Centered form, smaller illustration above
- **Mobile (< 768px):** Full-width stacked layout, no illustration

---

## 🛠️ TECH STACK (For Implementation Reference)

- React 18+
- TailwindCSS 3
- Lucide React (icons)
- Vite (build tool)

---

## ✅ DELIVERABLES EXPECTED

Please provide:
1. **Visual designs** for all 4 pages (Figma, image mockups, or detailed descriptions)
2. **Color tokens** and spacing guidelines
3. **Component breakdown** (what elements to build)
4. **Responsive behavior** notes
5. **Animation/interaction** suggestions (hover states, transitions)

---

## 🚫 AVOID

- Generic corporate blue themes (use the lime-green accent!)
- Overly complex forms with too many fields
- Dark mode (not needed for this project)
- Aggressive sales language (keep it professional)
- Stock photos of random warehouses (prefer illustrations or abstract graphics)
```

---

## 📌 QUICK SUMMARY

| Page                | Key Focus                                        |
| ------------------- | ------------------------------------------------ |
| **Landing**         | Product value, features showcase, drive sign-ups |
| **Login**           | Quick access, social login, glass morphism       |
| **Sign Up**         | Low friction, password strength, terms checkbox  |
| **Forgot Password** | Simple flow, clear success state                 |

## 🎨 Brand Colors Quick Reference

| Color          | Hex       | Usage                  |
| -------------- | --------- | ---------------------- |
| Background     | `#F5F7F2` | Page background        |
| Primary (Lime) | `#a3e635` | Buttons, accents, logo |
| Emerald        | `#10b981` | Success, inbound       |
| Rose           | `#f43f5e` | Alerts, outbound       |
| Blue           | `#3b82f6` | Info, links            |
| Amber          | `#f59e0b` | Warnings               |
| Gray-800       | `#1f2937` | Primary text           |
| Gray-500       | `#6b7280` | Secondary text         |

---

**Copy the prompt above and paste it to your AI design tool (v0, Galileo AI, Claude, ChatGPT, Midjourney, etc.) to get started!**
