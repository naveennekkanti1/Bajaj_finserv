const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Seat = require('./models/seat');

const app = express();

// Middleware to enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = 'mongodb+srv://naveennekkanti:02foMOAKcvqthTRs@cluster0.2zvzf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Initialize seat data
async function initializeSeats() {
  const seatCount = 80;
  const existingSeats = await Seat.countDocuments();
  
  if (existingSeats === 0) {
    const seats = Array.from({ length: seatCount }, (_, i) => ({
      id: i + 1,
      status: 'available'
    }));
    await Seat.insertMany(seats);
  }
}

initializeSeats();

// Helper to check nearby seats for booking
async function findNearbySeats(numSeats) {
  let availableSeats = [];
  const rowCapacity = 7;

  for (let i = 0; i < 80; i += rowCapacity) {
    const row = await Seat.find({ status: 'available' }).skip(i).limit(rowCapacity);
    if (row.length >= numSeats) {
      availableSeats = row.slice(0, numSeats).map(seat => seat.id);
      break;
    }
  }

  if (availableSeats.length === 0) {
    availableSeats = (await Seat.find({ status: 'available' }).limit(numSeats)).map(seat => seat.id);
  }

  return availableSeats;
}

// Route to book seats
app.post('/book', async (req, res) => {
  const { numSeats } = req.body;

  if (numSeats > 7) {
    return res.status(400).send('Cannot book more than 7 seats at a time.');
  }

  const nearbySeats = await findNearbySeats(numSeats);

  if (nearbySeats.length < numSeats) {
    return res.status(400).send('Not enough seats available.');
  }

  await Seat.updateMany({ id: { $in: nearbySeats } }, { status: 'booked' });

  res.json({ bookedSeats: nearbySeats });
});

// Route to update seat status (book/unbook)
app.post('/update-seat-status', async (req, res) => {
  const { seatId, status } = req.body;

  if (!['available', 'booked'].includes(status)) {
    return res.status(400).send('Invalid status. Use "available" or "booked".');
  }

  if (seatId < 1 || seatId > 80) {
    return res.status(400).send('Invalid seatId. SeatId must be between 1 and 80.');
  }

  const seat = await Seat.findOne({ id: seatId });

  if (status === 'available' && seat.status !== 'booked') {
    return res.status(400).send(`Seat ${seatId} is already available and cannot be unbooked.`);
  }

  if (status === 'booked' && seat.status !== 'available') {
    return res.status(400).send(`Seat ${seatId} is already booked.`);
  }

  seat.status = status;
  await seat.save();

  res.json({ message: `Seat ${seatId} is now ${status}.` });
});

// Route to get the current seat status
app.get('/seats', async (req, res) => {
  const seats = await Seat.find();
  res.json(seats);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
