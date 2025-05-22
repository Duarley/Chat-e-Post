# Social Media App with Chat

A full-featured social media application with posts and chat functionality, including audio messages like WhatsApp. Built with React, Vite, and Firebase, with mobile export capabilities using Capacitor.

## Features

- User authentication with email/password and Google login
- User profiles with customizable profile pictures
- Post creation with text and image support
- Real-time chat with:
  - Text messages
  - Image and file sharing
  - Voice messages (recording and playback)
- Dark/light mode support
- Responsive design for all devices
- Android APK export with Capacitor

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
3. Create a Firebase project and enable:
   - Authentication (Email/Password and Google)
   - Firestore Database
   - Storage

4. Copy `.env.example` to `.env` and fill in your Firebase configuration

5. Start the development server:
   \`\`\`
   npm run dev
   \`\`\`

## Building for Android

1. Build the web app:
   \`\`\`
   npm run build
   \`\`\`

2. Add Android platform (first time only):
   \`\`\`
   npm run cap:add
   \`\`\`

3. Sync the web build with Capacitor:
   \`\`\`
   npm run cap:sync
   \`\`\`

4. Open in Android Studio:
   \`\`\`
   npm run cap:open
   \`\`\`

5. Build and run from Android Studio

## Project Structure

- `/src/components` - Reusable UI components
- `/src/pages` - Main application pages
- `/src/firebase` - Firebase configuration and utilities
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utility functions

## Technologies Used

- React + Vite
- TypeScript
- Firebase (Auth, Firestore, Storage)
- Tailwind CSS
- shadcn/ui components
- Capacitor for mobile export
- MediaRecorder API for audio recording
