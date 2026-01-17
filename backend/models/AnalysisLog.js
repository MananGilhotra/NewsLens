const mongoose = require('mongoose');

const AnalysisLogSchema = new mongoose.Schema({
  // Type of input: 'url' or 'text'
  inputType: {
    type: String,
    enum: ['url', 'text'],
    required: true
  },
  
  // The actual content that was analyzed
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  
  // Verification score from Gemini (0-100)
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Verdict: Real, Fake, or Inconclusive
  verdict: {
    type: String,
    enum: ['Real', 'Fake', 'Inconclusive'],
    required: true
  },
  
  // Brief reasoning from AI
  reasoning: {
    type: String,
    required: true
  },
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
AnalysisLogSchema.index({ createdAt: -1 });
AnalysisLogSchema.index({ verdict: 1 });

module.exports = mongoose.model('AnalysisLog', AnalysisLogSchema);
