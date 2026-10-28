const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index on (cityId, name)
stopSchema.index({ cityId: 1, name: 1 }, { unique: true });

const Stop = mongoose.models.Stop || mongoose.model('Stop', stopSchema);

module.exports = Stop;
module.exports.Stop = Stop;
