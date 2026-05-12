# Smart Campus - Event & Venue Management System

## 🎯 Project Overview

Smart Campus is a comprehensive event and venue management system designed for universities and educational institutions. It provides a complete solution for managing events, booking venues, handling waitlists, and generating reports with role-based access control.

## ✨ Key Features

### 1. **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Student, Faculty, Admin, Staff)
- Secure password hashing with bcrypt
- Profile management

### 2. **Event Management**
- Create and manage events with categories (Academic, Sports, Cultural, etc.)
- Event approval workflow
- Priority levels (Low, Medium, High, Urgent)
- Recurring events support
- Event status tracking (Pending, Approved, Rejected, Cancelled)

### 3. **Venue Management**
- Browse available venues with capacity and facilities
- Real-time availability checking
- Venue search and filtering
- Facility and equipment tracking
- Dynamic resource management

### 4. **Booking System**
- Smart booking with conflict detection
- Time slot validation (30 min - 2 hours)
- Automatic waitlist management
- Booking approval workflow
- Alternative slot recommendations

### 5. **Waitlist Management**
- Priority-based queue system
- Automatic promotion when slots become available
- Waitlist status tracking
- Conflict resolution

### 6. **Notifications System**
- Real-time notification bell with badge counter
- Multiple notification types:
  - Event approved/rejected
  - Booking confirmed/cancelled
  - Waitlist promotion
  - Venue conflicts
  - System notifications
- Mark as read functionality
- Notification filtering

### 7. **Reporting & Analytics**
- Venue utilization statistics
- Booking reports
- Event analytics
- Resource utilization tracking
- Date range filtering

### 8. **Resource Management**
- Track facilities (Air Conditioning, Projector, etc.)
- Equipment management
- Search venues by required resources
- Resource utilization reports

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── config/
│   └── supabase.js          # Database configuration
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── bookingController.js  # Booking management
│   ├── eventController.js    # Event operations
│   ├── venueController.js    # Venue management
│   ├── waitlistController.js # Waitlist handling
│   ├── notificationController.js # Notifications
│   ├── reportController.js   # Analytics & reports
│   └── resourceController.js # Resource management
├── middleware/
│   ├── auth.js              # JWT verification
│   └── roleCheck.js         # Role-based access
├── routes/
│   ├── auth.js
│   ├── bookings.js
│   ├── events.js
│   ├── venues.js
│   ├── waitlists.js
│   ├── notifications.js
│   ├── reports.js
│   └── resources.js
├── utils/
│   ├── conflictDetector.js  # Booking conflict detection
│   ├── emailService.js      # Email notifications
│   └── scheduler.js         # Scheduled tasks
└── server.js                # Main application entry
```

### Frontend (Vanilla JavaScript)
```
frontend/
├── css/
│   └── styles.css           # Global styles
├── js/
│   ├── api.js               # API client
│   ├── auth.js              # Auth helpers
│   ├── dashboard.js         # Dashboard logic
│   ├── events.js            # Event management
│   ├── notifications.js     # Notification handling
│   ├── utils.js             # Utility functions
│   └── venues.js            # Venue browsing
├── dashboard.html           # User dashboard
├── events.html              # Event management
├── venues.html              # Venue browsing & booking
├── bookings.html            # My bookings
├── waitlist.html            # Waitlist management
├── reports.html             # Analytics & reports
├── notifications.html       # Notification center
├── login.html               # Login page
└── index.html               # Test page
```

### Database (PostgreSQL via Supabase)
```
Tables:
- profiles          # User profiles
- venues            # Venue information
- events            # Event details
- bookings          # Venue bookings
- waitlists         # Waitlist entries
- notifications     # User notifications
- audit_logs        # System audit trail
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- PostgreSQL database

### Installation

1. **Clone the repository**
```bash
cd Smart_Campus
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**
Create a `.env` file in the backend directory:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
```

4. **Set up the database**
- Go to your Supabase project
- Run the SQL script from `database/complete_schema.sql`
- This will create all tables, triggers, and seed data

5. **Start the backend server**
```bash
npm start
# or for development with auto-reload
npm run dev
```

6. **Open the frontend**
- Open `frontend/login.html` in your browser
- Or use a local server:
```bash
cd frontend
python -m http.server 8000
# Then visit http://localhost:8000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `PUT /api/events/:id/status` - Update event status
- `DELETE /api/events/:id` - Cancel event

### Venues
- `GET /api/venues` - List all venues
- `GET /api/venues/:id` - Get venue details
- `GET /api/venues/:id/availability` - Check availability
- `POST /api/venues` - Create venue (admin)
- `PUT /api/venues/:id` - Update venue (admin)

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/approve` - Approve booking (admin)
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Waitlists
- `GET /api/waitlists` - List waitlist entries
- `POST /api/waitlists` - Add to waitlist
- `PUT /api/waitlists/:id/cancel` - Cancel waitlist entry

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read

### Reports
- `GET /api/reports/venue-utilization` - Venue usage stats
- `GET /api/reports/booking-summary` - Booking summary
- `GET /api/reports/event-analytics` - Event analytics

### Resources
- `GET /api/resources` - List all resources
- `GET /api/resources/venue/:venueId` - Get venue resources
- `GET /api/resources/search` - Search venues by resources
- `GET /api/resources/utilization` - Resource utilization stats

## 🔐 Security Features

1. **JWT Authentication** - Secure token-based authentication
2. **Password Hashing** - bcrypt with salt rounds
3. **Rate Limiting** - Prevent API abuse
4. **CORS Protection** - Controlled cross-origin requests
5. **Helmet.js** - Security headers
6. **Row Level Security** - Database-level access control
7. **Input Validation** - Prevent SQL injection and XSS

## 🎨 UI Features

1. **Responsive Design** - Works on all devices
2. **Real-time Updates** - Live notification badge
3. **Dynamic Content** - No static data
4. **Loading States** - User-friendly loading indicators
5. **Error Handling** - Clear error messages
6. **Modal Dialogs** - Smooth user interactions
7. **Filter & Search** - Easy data discovery

## 🔄 Dynamic Features

### All Data is Dynamic:
- ✅ Dashboard stats (events, bookings, pending count)
- ✅ Event listings with real-time status
- ✅ Venue availability checking
- ✅ Booking management
- ✅ Waitlist processing
- ✅ Notification system
- ✅ Reports and analytics
- ✅ Resource tracking

### No Static Data:
- All counts are fetched from database
- Real-time conflict detection
- Automatic waitlist promotion
- Dynamic slot generation
- Live notification updates

## 🧪 Testing

### Manual Testing Checklist:
1. ✅ User registration and login
2. ✅ Create and manage events
3. ✅ Browse and book venues
4. ✅ Check availability
5. ✅ Waitlist functionality
6. ✅ Notification system
7. ✅ Dashboard statistics
8. ✅ Reports generation
9. ✅ Admin approval workflow
10. ✅ Conflict detection

### Test User Accounts:
After running the seeder, you can create test accounts with different roles:
- Student: test-student@university.edu
- Faculty: test-faculty@university.edu
- Admin: test-admin@university.edu

## 📊 Database Schema Highlights

### Key Constraints:
- Booking duration: 30 minutes to 2 hours
- No overlapping bookings (enforced by trigger)
- Automatic profile creation on signup
- Cascade deletes for data integrity

### Triggers:
- `update_updated_at_column()` - Auto-update timestamps
- `check_booking_conflicts()` - Prevent double bookings
- `handle_new_user()` - Auto-create profiles
- `sync_booking_times()` - Keep event/booking times in sync
- `mark_notification_read()` - Track read timestamps

## 🛠️ Technologies Used

### Backend:
- Node.js
- Express.js
- Supabase (PostgreSQL)
- JWT for authentication
- bcrypt for password hashing
- express-rate-limit
- helmet.js
- cors

### Frontend:
- Vanilla JavaScript (ES6+)
- HTML5
- CSS3
- Font Awesome icons
- Fetch API

### Database:
- PostgreSQL
- Row Level Security (RLS)
- Triggers and Functions
- Indexes for performance

## 🐛 Error Handling

The system includes comprehensive error handling:
- API errors with proper status codes
- User-friendly error messages
- Console logging for debugging
- Graceful fallbacks
- Validation errors

## 📈 Performance Optimizations

1. **Database Indexes** - Fast query performance
2. **Efficient Queries** - Optimized SQL
3. **Caching** - LocalStorage for user data
4. **Rate Limiting** - Prevent server overload
5. **Lazy Loading** - Load data as needed

## 🔮 Future Enhancements

- [ ] Email notifications
- [ ] Calendar integration
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Bulk operations
- [ ] Export reports (PDF/Excel)
- [ ] QR code check-in
- [ ] Payment integration
- [ ] Multi-language support

## 📝 License

This project is for educational purposes.

## 👥 Support

For issues or questions, please check the documentation or contact the development team.

---

**Last Updated:** December 5, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
