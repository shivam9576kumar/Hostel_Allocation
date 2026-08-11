# IIT Hostel Booking and Allocation System

A complete, production-ready Hostel Booking and Allocation System built for an IIT-style academic institution using **Node.js, Express, PostgreSQL, Sequelize ORM, Redis, React (Vite), Tailwind CSS, PDFKit, and node-cron**.

---

## 🌟 Key Features

### Admin Module
- **Super Admin & Admin Authentication**: Local login with email and bcrypt-hashed passwords. Pre-seeded accounts (`Admin@123`).
- **Bulk Student Data Upload**: Ingest CSV/Excel rosters (`RollNumber, FullName, Email, Gender, Programme, Year`) with duplicate detection and ingestion reports.
- **Hierarchical Structure Management**: Full CRUD for Hostels, Blocks, Floors, and Rooms with cascading deletions.
- **Clear Data Action**: Reset room hierarchies and student bookings for a selected hostel while preserving the hostel entry and student profiles.
- **Reservation Toggles**: Instantly reserve blocks, floors, or rooms (`is_reserved = true`), rendering them invisible to students.
- **Eligibility & Time Window Rules**: Configure allowed gender, programme (B.Tech, M.Tech, M.Sc, PhD), allowed year (1–5), and active booking start/end times.
- **Admin UI Filters**: Comprehensive filter controls with an explicit `"Select All"` option.

### Student Module
- **Microsoft Single Sign-On (OAuth)**: Authenticate students via Microsoft OAuth and verify their email against the `students` database.
- **Cascading Room Selection**: 4-stage sequential selection (`Hostel → Block → Floor → Room`).
- **Dynamic 10-Minute Pairing Code**:
  - **Student A** selects a vacant room → receives a 6-digit numeric pairing code (valid for 10 minutes backed by Redis TTL `room:code:{roomId}`). Room status becomes `Pending_Pairing` (red).
  - **Student B** enters the room → inputs the 6-digit code → room status locks (`current_occupancy = 2`).
- **Automated Expiry Cleanup**: Node-cron background task (runs every 60s) automatically reverts expired pending rooms to `Vacant` and clears stale bookings.
- **Allocation Certificate Generation**: Auto-generates an official PDF certificate (`allocation_{rollA}_{rollB}.pdf`) via `PDFKit`.
- **Post-Booking State Persistence**: Locked students are automatically redirected to their allocation certificate page upon logging in.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **ORM** | Sequelize (v6+) |
| **Database** | PostgreSQL (v12+) |
| **Caching & TTL** | Redis (v4+) via `ioredis` (with automatic in-memory fallback) |
| **Auth & Security** | JWT, bcryptjs, Microsoft OAuth (MSAL.js) |
| **Document & Data Parsing** | `pdfkit`, `multer`, `xlsx` |
| **Background Cron** | `node-cron` |
| **Frontend** | React (Vite), Tailwind CSS, Lucide Icons, Axios |

---

## 📁 Repository Structure

```text
hostel-booking-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── redis.js
│   │   │   └── env.js
│   │   ├── models/
│   │   │   └── index.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── adminController.js
│   │   │   ├── studentController.js
│   │   │   └── bookingController.js
│   │   ├── routes/
│   │   │   ├── adminRoutes.js
│   │   │   ├── studentRoutes.js
│   │   │   └── authRoutes.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── adminAuth.js
│   │   ├── utils/
│   │   │   ├── pdfGenerator.js
│   │   │   ├── csvParser.js
│   │   │   └── codeGenerator.js
│   │   ├── jobs/
│   │   │   └── expiryCleanup.js
│   │   └── app.js
│   ├── package.json
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Student/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── CascadingDropdown.jsx
│   │   │   │   ├── RoomGrid.jsx
│   │   │   │   ├── BookingModal.jsx
│   │   │   │   ├── PairCodeModal.jsx
│   │   │   │   └── PDFView.jsx
│   │   │   └── Admin/
│   │   │       ├── AdminLogin.jsx
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── HostelManager.jsx
│   │   │       ├── BlockManager.jsx
│   │   │       ├── FloorManager.jsx
│   │   │       ├── RoomManager.jsx
│   │   │       ├── StudentUpload.jsx
│   │   │       └── Settings.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── package.json
│   └── .env
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seeds/
│       └── admin_seed.js
├── students_500.csv
└── README.md
```

---

## ⚡ Quickstart Setup Guide

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL** (running locally on default port `5432` or via cloud URL)
- **Redis** (optional; server gracefully falls back to an in-memory TTL store if Redis service is not active)

---

### 2. Database Initialization & Seeding

1. Create the PostgreSQL database `hostel_booking`:
   ```bash
   createdb -U postgres hostel_booking
   ```

2. Execute the schema migration SQL script:
   ```bash
   psql -U postgres -d hostel_booking -f database/migrations/001_initial_schema.sql
   ```

---

### 3. Backend Setup

1. Navigate to `backend/` and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Verify environment configuration in `backend/.env`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=hostel_booking
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=super_secret_iit_hostel_jwt_key_2026
   ```

3. Seed default Admin accounts:
   ```bash
   npm run seed
   ```
   *Seeded Admin Credentials (Password: `Admin@123`):*
   - **Super Admin**: `baboo.boss@admin.iit.ac.in`
   - **Admin**: `shubham@admin.iit.ac.in`
   - **Admin**: `ayesha.khan@admin.iit.ac.in`

4. Start backend server:
   ```bash
   npm start
   ```
   *(Server starts on `http://localhost:5000`)*

---

### 4. Frontend Setup

1. Open a new terminal tab, navigate to `frontend/` and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start React development server:
   ```bash
   npm run dev
   ```
   *(Frontend accessible at `http://localhost:3000`)*

---

## 🧪 End-to-End Testing Walkthrough

### Step A: Admin Roster & Hostel Configuration
1. Open `http://localhost:3000` and click **"Admin Portal Sign In"**.
2. Log in using `baboo.boss@admin.iit.ac.in` with password `Admin@123`.
3. Go to **"Student Data Upload"** tab:
   - Select `students_500.csv` from root project directory and click **Upload Roster Data**.
   - Verify 500 student rows ingested.
4. Go to **"Hostels & Eligibility"** tab:
   - Create a hostel named `Kumaon Hostel`, Allowed Gender: `Male`, Programme: `B.Tech`, Year: `3`.
   - Set active time window (e.g. current date/time to next month).
5. Go to **"Blocks"** tab and create `Block A` under `Kumaon Hostel`.
6. Go to **"Floors"** tab and create `Floor 1` under `Block A`.
7. Go to **"Rooms Grid"** tab and create `Room 101` on `Floor 1`.

### Step B: Primary Student Room Selection (Student A)
1. Sign out of Admin Portal and log in as Student A:
   - Select **"Aryan Sharma (B.Tech Year 3, Male)"** (`aryan.sharma@iit.ac.in`) from the quick test dropdown.
2. Select **Kumaon Hostel** → **Block A** → **Floor 1**.
3. Room `101` appears green (**Vacant**).
4. Click Room `101` → Click **Confirm & Book**.
5. A 6-digit pairing code (e.g. `849201`) appears with a **10-minute live countdown timer**.
6. Room `101` updates to **Pending_Pairing** (amber/red).

### Step C: Roommate Pairing & PDF Allocation (Student B)
1. Open an Incognito window or separate browser tab at `http://localhost:3000`.
2. Log in as Student B:
   - Select **"Rohan Gupta (B.Tech Year 3, Male)"** (`rohan.gupta@iit.ac.in`).
3. Select **Kumaon Hostel** → **Block A** → **Floor 1**.
4. Click Room `101` (amber status) → Enter the 6-digit code from Student A.
5. Click **Verify & Lock Room**.
6. The room updates to **Locked** (`current_occupancy = 2`).
7. Both Student A and Student B are redirected to their **Official Allocation Certificate** page with a **Download PDF** button!
