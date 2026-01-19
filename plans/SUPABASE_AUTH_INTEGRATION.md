# Supabase Auth Integration Plan

## Overview

This document outlines the architecture and implementation plan to integrate Supabase Authentication into the GudangAI dashboard. The integration will support:

- **Email/Password** authentication
- **Google OAuth** authentication
- Session persistence and auto-refresh
- Protected routes

---

## Current State Analysis

| Aspect              | Current State               | Target State                      |
| ------------------- | --------------------------- | --------------------------------- |
| Auth Library        | None                        | `@supabase/supabase-js`           |
| Auth State          | Local `useState` in App.jsx | AuthContext with Supabase session |
| Login/Signup        | Mock (console.log only)     | Real Supabase auth calls          |
| Protected Routes    | None                        | Dashboard requires authentication |
| Session Persistence | None                        | Supabase handles via localStorage |

---

## Architecture Design

### System Context Diagram (C4 L1)

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              GudangAI Dashboard (React)                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ Auth Pages  │  │  Dashboard  │  │  Landing Page   │   │  │
│  │  │ Login/Sign  │  │  Protected  │  │    Public       │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────────┘   │  │
│  │         │                │                                │  │
│  │         ▼                ▼                                │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │              AuthContext Provider                    │ │  │
│  │  │  - user state    - loading state                     │ │  │
│  │  │  - signIn()      - signUp()      - signOut()        │ │  │
│  │  │  - signInWithGoogle()                                │ │  │
│  │  └──────────────────────┬──────────────────────────────┘ │  │
│  └─────────────────────────┼────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │      Supabase Backend        │
              │  ┌────────────────────────┐  │
              │  │    Supabase Auth       │  │
              │  │  - Email/Password      │  │
              │  │  - Google OAuth        │  │
              │  │  - Session Management  │  │
              │  └────────────────────────┘  │
              │  ┌────────────────────────┐  │
              │  │   PostgreSQL (future)  │  │
              │  │  - User profiles       │  │
              │  │  - Warehouse data      │  │
              │  └────────────────────────┘  │
              └──────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │      Google OAuth Provider   │
              │  (for Google Sign-In)        │
              └──────────────────────────────┘
```

### Auth Flow Sequence Diagram

```
┌──────┐          ┌───────────┐         ┌─────────────┐        ┌────────┐
│ User │          │ LoginPage │         │ AuthContext │        │Supabase│
└──┬───┘          └─────┬─────┘         └──────┬──────┘        └───┬────┘
   │                    │                      │                   │
   │ Enter credentials  │                      │                   │
   │───────────────────>│                      │                   │
   │                    │                      │                   │
   │                    │ signIn(email, pass)  │                   │
   │                    │─────────────────────>│                   │
   │                    │                      │                   │
   │                    │                      │ supabase.auth     │
   │                    │                      │ .signInWithPassword
   │                    │                      │──────────────────>│
   │                    │                      │                   │
   │                    │                      │   session + user  │
   │                    │                      │<──────────────────│
   │                    │                      │                   │
   │                    │      user object     │                   │
   │                    │<─────────────────────│                   │
   │                    │                      │                   │
   │ Navigate to        │                      │                   │
   │ Dashboard          │                      │                   │
   │<───────────────────│                      │                   │
```

---

## File Structure (New/Modified)

```
dashboard/src/
├── lib/
│   └── supabase.js              # NEW: Supabase client initialization
├── contexts/
│   └── AuthContext.jsx          # NEW: Auth state management
├── components/
│   └── auth/
│       ├── LoginPage.jsx        # MODIFY: Use real Supabase auth
│       ├── SignupPage.jsx       # MODIFY: Use real Supabase auth
│       ├── ForgotPasswordPage.jsx # MODIFY: Use Supabase resetPassword
│       └── ProtectedRoute.jsx   # NEW: Route guard component
├── App.jsx                      # MODIFY: Wrap with AuthProvider
└── .env.example                 # MODIFY: Add Supabase env vars
```

---

## Implementation Details

### 1. Supabase Client (`lib/supabase.js`)

```javascript
// Creates a singleton Supabase client
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from env
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2. AuthContext (`contexts/AuthContext.jsx`)

**Responsibilities:**

- Hold `user` and `session` state
- Subscribe to `onAuthStateChange` events
- Provide auth methods: `signIn`, `signUp`, `signOut`, `signInWithGoogle`, `resetPassword`
- Handle loading state during initial session check

**Key Pattern:**

```javascript
// On mount, check existing session
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  });

  // Listen for auth changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
```

### 3. Auth Methods

| Method         | Supabase Call                                           | Notes                                        |
| -------------- | ------------------------------------------------------- | -------------------------------------------- |
| Sign Up        | `supabase.auth.signUp({ email, password })`             | Returns user, may require email confirmation |
| Sign In        | `supabase.auth.signInWithPassword({ email, password })` | Returns session + user                       |
| Google OAuth   | `supabase.auth.signInWithOAuth({ provider: 'google' })` | Redirects to Google                          |
| Sign Out       | `supabase.auth.signOut()`                               | Clears session                               |
| Reset Password | `supabase.auth.resetPasswordForEmail(email)`            | Sends reset email                            |

### 4. Protected Route Pattern

```javascript
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;

  return children;
};
```

---

## Supabase Dashboard Configuration

### Required Settings in Supabase Dashboard:

1. **Authentication → Providers → Email**
   - Enable "Email" provider
   - Configure "Confirm email" (optional for dev, recommended for prod)

2. **Authentication → Providers → Google**
   - Enable Google provider
   - Add Google OAuth credentials (Client ID + Secret from Google Cloud Console)

3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173` (dev) / your production URL
   - Redirect URLs:
     - `http://localhost:5173` (dev)
     - `https://your-app.vercel.app` (prod)

4. **Google Cloud Console** (for Google OAuth):
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`

---

## Environment Variables

Add to `.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**

- Supabase Dashboard → Settings → API
- URL = Project URL
- Anon Key = `anon` `public` key (safe for client-side)

---

## Error Handling Strategy

| Error Type          | User Message                                | Action               |
| ------------------- | ------------------------------------------- | -------------------- |
| Invalid credentials | "Invalid email or password"                 | Show inline error    |
| Email not confirmed | "Please confirm your email first"           | Show resend option   |
| User already exists | "An account with this email already exists" | Link to login        |
| Network error       | "Connection failed. Please try again"       | Retry button         |
| OAuth cancelled     | (silent)                                    | Return to login page |

---

## Security Considerations

1. **ANON_KEY is public** - It's designed to be exposed in client-side code. Row Level Security (RLS) in Supabase protects data.

2. **Never expose SERVICE_ROLE_KEY** - Only use in backend/server-side code.

3. **Session stored in localStorage** - Supabase handles this automatically. Sessions auto-refresh before expiry.

4. **HTTPS required for OAuth** - Google OAuth won't work on non-HTTPS in production.

---

## Implementation Checklist

### Phase 1: Setup & Infrastructure

- [ ] Install `@supabase/supabase-js` package
- [ ] Create `lib/supabase.js` client
- [ ] Add Supabase env vars to `.env` and `.env.example`
- [ ] Create `contexts/AuthContext.jsx`
- [ ] Wrap App with `AuthProvider`

### Phase 2: Update Auth Pages

- [ ] Update `LoginPage.jsx` to use `signIn` from context
- [ ] Update `SignupPage.jsx` to use `signUp` from context
- [ ] Update `ForgotPasswordPage.jsx` to use `resetPasswordForEmail`
- [ ] Add Google OAuth button handlers
- [ ] Add error handling and loading states

### Phase 3: Protected Routes

- [ ] Create `ProtectedRoute.jsx` component
- [ ] Protect dashboard route
- [ ] Add logout functionality to dashboard header
- [ ] Handle OAuth callback/redirect

### Phase 4: Supabase Dashboard Config

- [ ] Enable Email provider
- [ ] Enable Google OAuth provider
- [ ] Configure redirect URLs
- [ ] Test email confirmation flow (if enabled)

### Phase 5: Testing & Polish

- [ ] Test email/password login
- [ ] Test email/password signup
- [ ] Test Google OAuth flow
- [ ] Test password reset
- [ ] Test session persistence (refresh page)
- [ ] Test logout

---

## Trade-offs & Decisions

| Decision                        | Rationale                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Use Supabase Auth vs custom JWT | Supabase provides built-in session management, OAuth integrations, and security best practices out of the box |
| Context API vs Redux/Zustand    | Auth state is simple (user + session); Context is sufficient and avoids extra dependencies                    |
| No email confirmation (dev)     | Speeds up development; enable for production                                                                  |
| Client-side only auth           | Sufficient for dashboard; add server-side verification if backend API needs auth                              |

---

## Future Enhancements (Out of Scope)

1. **User Profiles Table** - Store additional user data (company, role)
2. **Role-Based Access Control** - Admin vs regular user
3. **Backend API Auth** - Verify Supabase JWT on Python backend
4. **Magic Link Login** - Passwordless authentication option

---

## Ready to Implement?

Once you approve this plan, switch to **Code mode** to begin implementation. The implementation order follows the checklist above.
