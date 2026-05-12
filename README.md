# 🚀 Quick Start Guide - Smart Campus

## Prerequisites Check
✅ Node.js installed
✅ npm installed
✅ All dependencies installed
✅ Supabase account ready

## Step-by-Step Setup

### 1. Configure Environment Variables
Edit `backend/.env` with your Supabase credentials:
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_secret_key_here
```

### 2. Set Up Database
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content from `database/complete_schema.sql`
4. Click "Run" to execute
5. Verify that all tables are created successfully

### 3. Start the Backend Server
```bash
cd backend
npm start
```

You should see:
```
🚀 Server running on port 5000
📊 Health check: http://localhost:5000/api/health
```

### 4. Test the API
Open your browser and visit:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "ok",
  "message": "Supabase connected successfully",
  "venues_count": 5
}
```

### 5. Open the Frontend
Open `frontend/login.html` in your browser or use a local server:
```bash
cd frontend
python -m http.server 8000
```
Then visit: `http://localhost:8000/login.html`

## First Time User Setup

### Register a New Account
1. Open `frontend/login.html`
2. Click "Register" or go to the registration form
3. Fill in your details:
   - Email: your-email@university.edu
   - Password: (secure password)
   - First Name: Your Name
   - Last Name: Your Surname
   - Role: Select your role (student/faculty/admin)
   - Department: Your department

### Login
1. Use your registered credentials
2. You'll be redirected to the dashboard

## Testing the Features

### 1. Dashboard
- View your profile information
- See dynamic stats (events, bookings, pending items)
- Access quick actions

### 2. Create an Event
1. Go to "Events" page
2. Click "Create Event"
3. Fill in event details:
   - Title: "Tech Workshop 2026"
   - Category: Academic
   - Description: Event description
   - Expected Attendance: 50
   - Priority: Medium
   - Start/End Date & Time
4. Submit

### 3. Book a Venue
1. Go to "Venues" page
2. Browse available venues
3. Click "Book Now" on a venue
4. Select your event from dropdown
5. Choose a date
6. Select an available time slot (green)
7. Confirm booking

### 4. Check Notifications
- Click the bell icon in the navbar
- View unread notifications
- Click "View all notifications" for full list

### 5. View Reports (Admin)
1. Go to "Reports" page
2. Select date range
3. View:
   - Venue utilization
   - Booking summary
   - Event analytics

## Common Issues & Solutions

### Issue: "Supabase connection failed"
**Solution:** 
- Check your `.env` file has correct Supabase credentials
- Verify your Supabase project is active
- Check internet connection

### Issue: "Token expired" or "Unauthorized"
**Solution:**
- Logout and login again
- Clear browser localStorage
- Check JWT_SECRET in `.env`

### Issue: "Port 5000 already in use"
**Solution:**
```bash
# Kill the process using port 5000
lsof -ti:5000 | xargs kill -9
# Or change PORT in .env to another port (e.g., 5001)
```

### Issue: Frontend can't connect to backend
**Solution:**
- Ensure backend server is running
- Check `frontend/js/api.js` has correct API_BASE_URL
- Currently set to: `http://localhost:5000/api`

### Issue: Database tables not created
**Solution:**
- Re-run the SQL script from `database/complete_schema.sql`
- Check Supabase SQL Editor for error messages
- Ensure you have proper permissions

## API Testing with cURL

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.edu",
    "password": "test123",
    "firstName": "Test",
    "lastName": "User",
    "role": "student",
    "department": "CS"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.edu",
    "password": "test123"
  }'
```

### Get Venues (with token)
```bash
curl http://localhost:5000/api/venues \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Development Mode

For development with auto-reload:
```bash
cd backend
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## Project Structure Quick Reference

```
Smart_Campus/
├── backend/              # Node.js backend
│   ├── controllers/      # Business logic
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & validation
│   ├── config/          # Configuration
│   └── server.js        # Entry point
├── frontend/            # Frontend files
│   ├── js/             # JavaScript files
│   ├── css/            # Stylesheets
│   └── *.html          # HTML pages
└── database/           # SQL scripts
```

## Next Steps

1. ✅ Explore the dashboard
2. ✅ Create your first event
3. ✅ Book a venue
4. ✅ Check notifications
5. ✅ View reports
6. ✅ Test waitlist functionality
7. ✅ Try conflict detection

## Support

- Check `PROJECT_DOCUMENTATION.md` for detailed information
- Review `DATABASE_SETUP.md` for database details
- Check console logs for debugging

## Production Deployment

Before deploying to production:
1. Change JWT_SECRET to a strong random string
2. Update CORS settings in `backend/server.js`
3. Set up proper environment variables
4. Enable HTTPS
5. Configure rate limiting
6. Set up monitoring and logging

---

**Happy Coding! 🎉**

For detailed documentation, see `PROJECT_DOCUMENTATION.md`
