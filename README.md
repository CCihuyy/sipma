<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5d461c87-7a5f-4403-bc4e-957809368b87

## Run Locally

**Prerequisites:** Node.js, a MySQL server running (schema in `siakad_db`)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=siakad_db
   ```
4. Run the new migration for enhanced features: 
   ```bash
   mysql -u root -p siakad_db < server/migrations/enhanced_features.sql
   ```
4. Start the server (development uses Vite middleware):
   ```bash
   npm run dev
   ```

## Attendance feature

The application now supports real attendance tracking for **dosen** and **mahasiswa**.
- Dosen can open/close sessions, view recap, and export PDF reports.
- Mahasiswa can see active sessions, submit attendance, and review their history.

The following new API endpoints are available under `/api/presensi`:

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/sessions`                   | list open lecture sessions |
| PUT    | `/sessions/:jadwalId/toggle`  | toggle open/close (dosen) |
| POST   | `/submit/:jadwalId`           | student submits status |
| GET    | `/history/:nim`               | student attendance history |
| GET    | `/recap/:kelasId`             | JSON recap per class |
| GET    | `/export/:kelasId`            | download PDF recap |

Front‑end pages that consume these APIs are located in `src/pages/mahasiswa` and
`src/pages/dosen` (see `Dashboard.tsx`, `SubmitAttendance.tsx`, `ManageAttendance.tsx`,
and `ViewRecap.tsx`).

Additional database setup or user attributes (nim/nidn stored on login) may be required to
fully integrate with authentication.
