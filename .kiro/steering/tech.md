# Technology Stack

## Backend (serenitas_backend)

### Core Technologies
- **Runtime**: Node.js
- **Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) with bcryptjs for password hashing

### Key Dependencies
- `express` - Web framework
- `mongoose` - MongoDB object modeling
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `express-validator` - Request validation
- `express-rate-limit` - API rate limiting
- `helmet` - Security headers

### Development Tools
- `nodemon` - Auto-restart during development

## Frontend (serenitas_app)

- React Native mobile application (structure pending)

## Common Commands

### Backend Development

```bash
# Navigate to backend
cd serenitas_backend

# Install dependencies
npm install

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Environment Setup

Required environment variables (create `.env` file):
```
MONGODB_URI=mongodb://localhost:27017/serenitas
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

### Database

- MongoDB must be running locally or provide MongoDB Atlas connection string
- Default local connection: `mongodb://localhost:27017/serenitas`
- Database connection is non-blocking (app continues if DB unavailable)

## Deployment

- **Backend**: Vercel (serverless)
- **Database**: MongoDB Atlas (cloud)
- See `DEPLOYMENT.md` for detailed deployment instructions
