const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  prompt: {
    type: String,
    default: ''
  },
  refinedPrompt: {
    type: String,
    default: ''
  },
  script: {
    type: String,
    default: ''
  },
  audioFilePath: {
    type: String,
    default: ''
  },
  videoFilePath: {
    type: String,
    default: ''
  },
  pythonCodePath: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['created', 'refining', 'script_generating', 'video_generating', 'completed', 'failed'],
    default: 'created'
  },
  errorMessage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp on every save
sessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
