const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    stopIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stop',
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

const Line = mongoose.models.Line || mongoose.model('Line', lineSchema);

module.exports = Line;
module.exports.Line = Line;
