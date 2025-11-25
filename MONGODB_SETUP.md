# MongoDB Session Management Setup

## What's New?

Your app now stores all session data in MongoDB for:
- **Session tracking**: Each video generation gets a unique session ID
- **Data persistence**: Prompts, scripts, and file paths are saved
- **History**: View past sessions and regenerate content
- **Analytics**: Track generation success/failure rates

## Database Schema

Each session stores:
```javascript
{
  sessionId: "uuid",              // Unique identifier
  prompt: "Original user prompt",
  refinedPrompt: "AI-refined prompt",
  script: "Generated script text",
  audioFilePath: "/path/to/audio.wav",
  videoFilePath: "http://localhost:3001/media/videos/final_123.mp4",
  pythonCodePath: "/path/to/scene.py",
  status: "completed",            // created, refining, script_generating, video_generating, completed, failed
  errorMessage: "",               // If failed
  createdAt: Date,
  updatedAt: Date
}
```

## Prerequisites

### Install MongoDB

**Windows:**
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will run as a Windows Service automatically

**Alternative (MongoDB Compass - GUI):**
- Download: https://www.mongodb.com/try/download/compass
- Connect to: `mongodb://localhost:27017`

**Verify MongoDB is running:**
```powershell
# Check if MongoDB service is running
Get-Service -Name MongoDB

# Or test connection
mongosh
```

## Configuration

The app is already configured! Just make sure MongoDB is running.

**.env file** (already updated):
```env
MONGODB_URI=mongodb://localhost:27017/manim_video_maker
```

## Testing

1. **Start MongoDB** (if not already running as service)
2. **Start Backend**:
   ```powershell
   cd BACKEND
   npm start
   ```
   You should see: `MongoDB connected successfully`

3. **Generate a video** through the app
4. **Check database**:
   ```powershell
   mongosh
   use manim_video_maker
   db.sessions.find().pretty()
   ```

## How It Works

### Frontend Flow
1. User clicks "Refine Prompt" → App generates UUID session ID
2. Session ID is passed to all subsequent API calls
3. All data (prompt, script, video) links to the same session ID

### Backend Flow
1. `/api/improve-prompt` → Creates session with prompt + refinedPrompt
2. `/api/generate-script` → Updates session with script
3. `/api/generate-audio` → Updates session with audioFilePath
4. `/api/generate-video` → Updates session with videoFilePath, sets status to 'completed'

### Error Handling
- If any step fails, session status is set to 'failed' with errorMessage
- Files remain on disk even if database connection fails (graceful degradation)

## Future Enhancements

You can now easily add:
- **Session history page**: List all past sessions
- **Regenerate from history**: Load old prompt/script and regenerate video
- **User accounts**: Link sessions to specific users
- **Analytics dashboard**: View success rates, popular topics
- **Search**: Find sessions by keyword in prompts

## Troubleshooting

**"MongoDB connection error"**
- Check if MongoDB service is running: `Get-Service -Name MongoDB`
- Try starting manually: `mongod --dbpath C:\data\db`
- App will still work without MongoDB (just won't save sessions)

**Sessions not saving**
- Check backend console for MongoDB connection message
- Verify MONGODB_URI in .env is correct
- Check MongoDB logs: `C:\Program Files\MongoDB\Server\<version>\log\mongod.log`

## Database Queries (Useful Commands)

```javascript
// Connect to database
mongosh
use manim_video_maker

// View all sessions
db.sessions.find().pretty()

// Find completed sessions
db.sessions.find({ status: 'completed' })

// Find sessions by prompt keyword
db.sessions.find({ prompt: /Pythagorean/ })

// Count total sessions
db.sessions.countDocuments()

// Delete old sessions (older than 7 days)
db.sessions.deleteMany({ 
  createdAt: { $lt: new Date(Date.now() - 7*24*60*60*1000) } 
})
```

## Production Notes

For production deployment:
1. Use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas
2. Update MONGODB_URI to Atlas connection string
3. Enable authentication
4. Set up backups
