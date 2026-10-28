const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema(
  {
    registration: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    seatNumbers: [
      {
        type: Number,
        required: true,
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Coach = mongoose.models.Coach || mongoose.model('Coach', coachSchema);

module.exports = Coach;
module.exports.Coach = Coach;
