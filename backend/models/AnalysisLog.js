const mongoose = require('mongoose');

const AnalysisLogSchema = new mongoose.Schema({
  // Owner of the analysis (absent for anonymous requests)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

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

  // Headline / short preview shown in the history list
  title: {
    type: String,
    maxlength: 300
  },

  url: String,

  // Credibility score (0-100)
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

  confidence: {
    type: String,
    enum: ['High', 'Medium', 'Low']
  },

  // Signals that contributed: model, llm, source, factChecks
  engine: [String],

  // Brief reasoning
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
