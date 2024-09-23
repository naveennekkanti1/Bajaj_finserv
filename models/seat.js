const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  status: { type: String, enum: ['available', 'booked'], default: 'available' }
});

module.exports = mongoose.model('Seat', seatSchema);
