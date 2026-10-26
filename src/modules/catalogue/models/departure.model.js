const mongoose = require('mongoose');

const departureSchema = new mongoose.Schema(
  {
    lineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Line',
      required: true,
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
      required: true,
    },
    // الـ Snapshot الثابت لضمان عدم تأثر الرحلة بتعديل الخط لاحقاً (ADR-6)
    lineSnapshot: {
      code: { type: String, required: true },
      label: { type: String, required: true },
      stopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
    },
    coachSnapshot: {
      registration: { type: String, required: true },
    },
    seatPlan: [{ type: Number, required: true }], // أرقام المقاعد المتاحة
    departureAt: { type: Date, required: true },
    arrivalAt: { type: Date, required: true },
    fareCents: { type: Number, required: true, min: 0 }, // المبالغ بالسنتمات (عدم وجود فواصل)
    status: {
      type: String,
      enum: ['OPEN', 'BOARDING', 'DEPARTED', 'CANCELLED'],
      default: 'OPEN',
    },
    revision: { type: Number, default: 0 }, // حقل حراسة التزامن (Concurrency Guard)
  },
  {
    timestamps: true,
  }
);

// الفهارس المطلوبة حسب مواصفات المشروع (Section 3.5)
departureSchema.index({ lineId: 1, departureAt: 1 });
departureSchema.index({ status: 1, departureAt: 1 });

const Departure = mongoose.model('Departure', departureSchema);

module.exports = { Departure };