# Deployment Guide - Serenitas Mental Health Clinic App

This guide provides instructions for deploying both the React Native app and the Node.js backend.

## 🚀 Backend Deployment (Vercel)

### Prerequisites
- Vercel account
- MongoDB Atlas database
- Environment variables configured

### Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to backend directory**
   ```bash
   cd serenitas_backend
   ```

3. **Deploy to Vercel**
   ```bash
   vercel
   ```

4. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add the following variables:
     ```
     MONGODB_URI=your_mongodb_atlas_connection_string
     JWT_SECRET=your_jwt_secret_key
     PORT=3000
     ```

5. **Update API Base URL**
   - Get your Vercel deployment URL
   - Update the API base URL in your React Native app:
     ```javascript
     // In your API configuration
     const API_BASE_URL = 'https://your-vercel-app.vercel.app/api';
     ```

## 📱 React Native App Deployment

### Android

1. **Generate Release APK**
   ```bash
   cd serenitas_app/android
   ./gradlew assembleRelease
   ```

2. **Generate Release AAB (for Google Play Store)**
   ```bash
   cd serenitas_app/android
   ./gradlew bundleRelease
   ```

3. **Sign the APK/AAB**
   - Create a keystore file
   - Configure signing in `android/app/build.gradle`
   - Build signed release

### iOS

1. **Archive the app**
   ```bash
   cd serenitas_app/ios
   xcodebuild -workspace serenitas_app.xcworkspace -scheme serenitas_app -configuration Release archive -archivePath serenitas_app.xcarchive
   ```

2. **Export IPA**
   - Use Xcode Organizer
   - Or use command line tools

## 🔧 Environment Configuration

### Backend Environment Variables
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/serenitas
JWT_SECRET=your_super_secret_jwt_key_here
PORT=3000
NODE_ENV=production
```

### Frontend Environment Variables
```env
API_BASE_URL=https://your-backend-url.vercel.app/api
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
```

## 📊 Database Setup

### MongoDB Atlas
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Set up database access (username/password)
4. Set up network access (IP whitelist)
5. Get connection string
6. Update environment variables

### Database Collections
The app will automatically create the following collections:
- `users` - User accounts and profiles
- `appointments` - Appointment scheduling
- `prescriptions` - Patient prescriptions
- `exams` - Medical exam results
- `mood_entries` - Daily mood check-ins

## 🔐 Security Considerations

### Production Checklist
- [ ] Use HTTPS for all API calls
- [ ] Implement proper CORS configuration
- [ ] Set up rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB Atlas security features
- [ ] Implement proper input validation
- [ ] Set up monitoring and logging

### Firebase Security Rules
```javascript
// Example Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📈 Monitoring and Analytics

### Backend Monitoring
- Vercel Analytics
- MongoDB Atlas monitoring
- Custom logging with Winston

### Frontend Analytics
- Firebase Analytics
- Crash reporting
- Performance monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./serenitas_backend
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS is configured for your frontend domain
   - Check if API calls are using correct URLs

2. **Database Connection Issues**
   - Verify MongoDB Atlas connection string
   - Check network access settings
   - Ensure database user has proper permissions

3. **Build Errors**
   - Clean and rebuild: `npx react-native clean`
   - Clear Metro cache: `npx react-native start --reset-cache`
   - Check Android SDK and Java versions

4. **Firebase Issues**
   - Verify google-services.json and GoogleService-Info.plist are correct
   - Check Firebase project configuration
   - Ensure package names match

## 📞 Support

For deployment issues:
1. Check the logs in Vercel Dashboard
2. Review MongoDB Atlas monitoring
3. Check React Native build logs
4. Create an issue in the GitHub repository

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [React Native Deployment](https://reactnative.dev/docs/signed-apk-android)
- [Firebase Console](https://console.firebase.google.com/) 