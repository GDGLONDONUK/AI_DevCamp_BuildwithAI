# AI DevCamp – Build with AI

> **🤖 GDG London & Build with AI – 4-Week Beginner AI Learning Program**

A modern web platform for the AI DevCamp program. Attendees can register, join sessions, submit weekly assignments, and showcase their final projects.

---

## ✨ Features

- 🔐 **Firebase Auth** – Email/Password & Google sign-in
- 👤 **User Profiles** – Bio, social links, experience level
- 📅 **Session Registration** – Register for any of the 6 sessions
- 📚 **Curriculum** – 4-week beginner AI learning path
- 📝 **Assignment Submission** – Submit weekly Python/ML assignments
- 🚀 **Project Submission** – Submit final AI projects
- 🛡️ **Admin Panel** – Manage users, review submissions, set statuses
- 📱 **Responsive** – Works on all devices

---

## 🗓 Sessions

| # | Title | Date | Week |
|---|-------|------|------|
| 1 | Kick Off | 23 April 2026 (Thu) | 1 |
| 2 | Python Deep Dive | 25 April 2026 (Sat) | 1 |
| 3 | Intro to AI & ML | 30 April 2026 (Thu) | 2 |
| 4 | Training Your First Model | 2 May 2026 (Sat) | 2 |
| 5 | Math & Data for ML | 7 May 2026 (Thu) | 3 |
| 6 | Closing & Demo Day | 19 May 2026 (Tue) | 4 |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
The `.env.local` file is already configured with the Firebase project settings.

### 3. Set up Firestore Rules
Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 📂 Project Structure

```
src/
├── app/                   # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── sessions/          # Session schedule & registration
│   ├── curriculum/        # 4-week curriculum overview
│   ├── dashboard/         # User dashboard
│   ├── submit/            # Assignment & project submission
│   ├── profile/           # User profile editor
│   └── admin/             # Admin panel
├── components/
│   ├── ui/                # Reusable UI components
│   ├── AuthModal.tsx      # Login/Register modal
│   └── Navbar.tsx         # Navigation
├── contexts/
│   └── AuthContext.tsx    # Firebase auth context
├── data/
│   └── sessions.ts        # Session & curriculum data
├── lib/
│   ├── firebase.ts        # Firebase config
│   ├── auth.ts            # Auth helpers
│   └── utils.ts           # Utilities
└── types/
    └── index.ts           # TypeScript types
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Authentication**: Firebase Auth (Email + Google)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **UI**: Tailwind CSS v4
- **Icons**: Lucide React
- **Fonts**: Poppins (Google Fonts)

---

## 🔒 Firestore Collections

| Collection | Description |
|------------|-------------|
| `users` | User profiles with role, registered sessions |
| `assignments` | Weekly assignment submissions |
| `projects` | Final project submissions |

---

## 👮 User Roles

| Role | Permissions |
|------|-------------|
| `attendee` | Register for sessions, submit work, edit own profile |
| `moderator` | Review submissions, manage users |
| `admin` | Full access including role management |

To make yourself admin, update your user document's `role` field to `"admin"` in the Firebase Console.

---

**Built for AI DevCamp 2026 – GDG London × Build with AI**
