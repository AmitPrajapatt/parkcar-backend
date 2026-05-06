const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    slotNumber: { type: String, required: true, unique: true },
    isOccupied: { type: Boolean, default: false }
});

module.exports = mongoose.model('Slot', slotSchema);