# Admin Panel Access Guide

## 🔐 How to Access the Admin Panel

### Option 1: Direct URL (Development)
When the frontend dev server is running, access the admin panel at:

```
http://localhost:5173/admin.html
```

### Option 2: Production Build
After building the project, the admin panel will be available at:

```
http://your-domain.com/admin.html
```

## 👤 Default Admin Credentials

```
Username: admin
Password: admin123
```

⚠️ **IMPORTANT**: Change these credentials in production!

## 🎯 Admin Panel Features

### Dashboard Overview
- **Total Candidates**: View all candidates who have taken interviews
- **Completed**: Candidates who finished their interviews
- **In Progress**: Candidates currently being interviewed
- **Disqualified**: Candidates who failed proctoring checks

### Candidate Management
- View all candidate details
- Filter by status (All, Passed, Failed, In Progress)
- See interview scores and proctoring status
- View timestamps and candidate information

### Data Displayed
- Candidate name and email
- Applied role and experience level
- Interview status
- Overall score (0-100)
- Proctoring status (Pass/Fail)
- Interview start time

## 🔒 Security Features

- JWT token-based authentication
- Secure API endpoints
- Auto-logout on token expiration
- Protected routes

## 🛠️ Changing Admin Credentials

To change admin credentials, update the backend configuration:

1. Open `backend/utils/auth.py`
2. Modify the `verify_admin_credentials()` function
3. Update username and password
4. Restart the backend server

## 📊 API Endpoints Used

- `POST /admin/login` - Admin authentication
- `GET /admin/candidates` - Fetch all candidates (requires auth token)

## 🚀 Quick Start

1. Start the backend server:
   ```bash
   cd backend
   uvicorn main_simple:app --reload --port 8000
   ```

2. Start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access admin panel:
   ```
   http://localhost:5173/admin.html
   ```

4. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`

## 📝 Notes

- The admin panel is separate from the candidate interview interface
- Candidates cannot access the admin panel
- Admin panel shows real-time data from the database
- Use the refresh button to update candidate list
- Filter options help you quickly find specific candidates
