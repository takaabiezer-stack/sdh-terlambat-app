# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sistem Manajemen Keterlambatan Siswa SDH KUPANG** — A full-stack web application for tracking and managing student tardiness, generating parent notification letters, and managing attendance records.

## Stack

- **Backend**: Node.js + Express + MongoDB (Mongoose), runs on port 5000
- **Frontend**: React + Vite + Tailwind CSS, runs on port 5173
- **Auth**: JWT stored in localStorage
- **PDF**: PDFKit (server-side generation)
- **Excel**: ExcelJS
- **Barcode**: html5-qrcode (client-side camera)

## Commands

### Backend
```bash
cd backend
npm install
npm run seed       # Create default roles, admin user, settings, sanctions
npm run dev        # Development with nodemon
npm start          # Production
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build
```

### Initial Setup
1. Start MongoDB locally
2. Copy `backend/.env.example` to `backend/.env` and configure
3. `cd backend && npm run seed` — creates admin account and default data
4. Start backend, then frontend
5. Login: username=`admin`, password=`Admin123!`

## Architecture

```
SDH-TERLAMBAT-APP/
├── backend/
│   ├── app.js              # Express entry point, all routes registered here
│   ├── config/database.js  # MongoDB connection
│   ├── models/             # Mongoose schemas
│   ├── controllers/        # Business logic (one file per entity)
│   ├── routes/             # Express routers (thin, delegates to controllers)
│   ├── middleware/
│   │   ├── auth.js         # authenticate (JWT) + authorize (permission check)
│   │   └── audit.js        # Wraps res.json to auto-log actions
│   └── utils/
│       ├── pdfGenerator.js # All PDF generation (reports + parent letters)
│       └── seedData.js     # Initial data seeder
└── frontend/
    └── src/
        ├── context/
        │   ├── AuthContext.jsx     # JWT management, user state, hasPermission()
        │   └── SettingsContext.jsx # School settings + CSS variable injection
        ├── components/Layout/      # Navbar, Sidebar, Layout wrapper
        ├── pages/                  # One page per route
        └── utils/api.js            # Axios instance with /api base and 401 redirect
```

## Key Patterns

**Permission system**: Roles store an array of permission strings (e.g. `attendance:create`, `student:read`). `authorize(...perms)` middleware checks all required permissions. Frontend uses `hasPermission(perm)` from AuthContext.

**Settings**: All configurable values (cutoff time, branding colors, thresholds) are stored as key-value pairs in MongoDB `Setting` collection. `settingController.getSettingValue(key)` fetches with fallback to DEFAULTS. Frontend injects CSS variables on load.

**Tardiness calculation**: Happens in `attendanceController.js`. Compares arrival time against `onTimeCutoff` setting + `gracePeriodMinutes`. Stored as `tardinessMinutes` integer on each Attendance record.

**PDF generation**: All PDFs generated server-side via PDFKit and streamed directly to response. No temp files.

**Vite proxy**: Frontend proxies `/api` and `/uploads` to `http://localhost:5000` in development.

## Default Roles

| Role | Key permissions |
|------|----------------|
| super_admin | All permissions |
| admin | All except role management |
| guru_bk | Attendance, sanctions, reports, parent letters |
| kepala_sekolah | Reports view, branding settings |
| wali_kelas | Own class attendance and reports |
| orang_tua | View own child's data |

## Data Models

- `Student`: NIS (unique), name, class, grade, parentName, parentPhone
- `Attendance`: student ref, date, arrivalTime, status (OnTime/Late/Absent/Excused), tardinessMinutes, sanctions[]
- `Sanction`: name, description, isActive
- `User`: username, email, passwordHash (bcrypt), role ref, assignedClass
- `Role`: name, displayName, permissions[]
- `Setting`: key (unique), value (Mixed)
- `ParentCall`: student ref, period, totalTardiness, tardinessDates[], letterGenerated
- `AuditLog`: action, user, resourceType, changes, timestamp

## API Endpoints

All protected endpoints require `Authorization: Bearer <token>` header.

- `POST /api/auth/login` — public
- `GET /api/auth/me` — get current user
- `GET /api/attendance/today` — today's attendance list
- `POST /api/attendance` — create attendance (barcode or manual)
- `GET /api/reports/daily?date=&class=&format=json|pdf|excel`
- `GET /api/reports/monthly?month=&year=&class=&format=`
- `GET /api/parent-calls/eligible` — students who reached threshold
- `GET /api/parent-calls/:id/letter` — stream PDF of parent letter
- `GET /api/students/nis/:nis` — lookup by NIS (used by barcode scanner)
- `POST /api/settings/logo` — upload school logo (multipart)
