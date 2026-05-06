const express = require('express');
const router = express.Router();
const Slot = require('../models/Slot');
const Session = require('../models/Session');

// 1. Dashboard Stats (Total, Available, Occupied)
router.get('/stats', async (req, res) => {
    try {
        const totalSlots = await Slot.countDocuments();
        const availableSlots = await Slot.countDocuments({ isOccupied: false });
        const occupiedSlots = totalSlots - availableSlots;
        res.json({ totalSlots, availableSlots, occupiedSlots });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Car Entry (Slot Assign)
// 2. Car Entry (Slot Assign)
router.post('/entry', async (req, res) => {
    try {
        // Frontend se userId bhi aayega ab
        const { carNumber, ownerName, userId } = req.body;

        if (!carNumber || !ownerName) {
            return res.status(400).json({ message: 'Car number and owner name are required!' });
        }

        const freeSlot = await Slot.findOne({ isOccupied: false });
        if (!freeSlot) return res.status(400).json({ message: 'No slots available!' });

        freeSlot.isOccupied = true;
        await freeSlot.save();

        const session = new Session({
            userId, // User ki ID database mein save ho rahi hai
            carNumber,
            ownerName,
            slotId: freeSlot._id,
            entryTime: new Date()
        });

        await session.save();
        res.status(201).json({ message: `Car Parked at ${freeSlot.slotNumber}`, slot: freeSlot.slotNumber });
    } catch (err) {
        console.error("Entry Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});
// 3. Car Exit & Bill Generation
router.post('/exit', async (req, res) => {
    try {
        const { carNumber } = req.body;

        const session = await Session.findOne({ carNumber, exitTime: null });
        if (!session) {
            return res.status(404).json({ message: 'Active session not found for this car!' });
        }

        session.exitTime = new Date();
        const durationMs = session.exitTime - session.entryTime;
        const durationHrs = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to nearest hour
        
        session.fee = durationHrs * 20; // Rate: ₹20/hr
        await session.save();

        // Free the slot
        await Slot.findByIdAndUpdate(session.slotId, { isOccupied: false });

        res.json({
            message: 'Bill Generated Successfully',
            bill: {
                carNumber: session.carNumber,
                ownerName: session.ownerName,
                duration: durationHrs,
                amount: session.fee,
                entryTime: session.entryTime,
                exitTime: session.exitTime
            }
        });
    } catch (err) {
        console.error("Exit Error:", err.message);
        res.status(500).json({ message: 'Internal Server Error during exit' });
    }
});

// 4. History (Reports)
router.get('/history', async (req, res) => {
    try {
        const { userId } = req.query; // Query check karega ki koi specific user manga hai kya
        let filter = {};
        
        if (userId) {
            filter.userId = userId; // Agar normal user hai toh filter lagao
        }
        // Agar Admin hai (koi userId nahi bheji), toh sabki history aayegi

        const history = await Session.find(filter).sort({ entryTime: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- UPDATE PAYMENT STATUS ---
// --- UPDATE PAYMENT STATUS ---
router.put('/history/:id/status', async (req, res) => {
    try {
        const { paymentStatus } = req.body; // 'paid' ya 'unpaid'
        
        // YAHAN FIX KIYA HAI: Parking ki jagah Session model use karna hai
        // Kyunki upar file mein aapne 'Session' naam se model import kiya hua hai
        const session = await Session.findById(req.params.id); 
        
        if (!session) {
            return res.status(404).json({ message: `Record nahi mila. ID: ${req.params.id}` });
        }
        
        // Status update aur save
        session.paymentStatus = paymentStatus;
        await session.save();
        
        res.status(200).json({ message: 'Payment updated!', session });
    } catch (err) {
        console.error("Payment Update Error:", err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// --- UPDATE TOTAL SLOTS (SYNC WITH DATABASE) ---
router.put('/settings', async (req, res) => {
    try {
        const { totalSlots } = req.body;
        
        // Database me check karo ki abhi kitne slots hain
        const currentTotal = await Slot.countDocuments();

        if (totalSlots > currentTotal) {
            // Agar Manager ne capacity badhayi hai -> Naye slots create karo
            const slotsToAdd = totalSlots - currentTotal;
            const newSlotsArray = [];
            
            for (let i = 1; i <= slotsToAdd; i++) {
                newSlotsArray.push({
                    slotNumber: `S-${currentTotal + i}`, // Naya naam (e.g., S-11, S-12)
                    isOccupied: false
                });
            }
            // Database me naye slots insert kar diye
            await Slot.insertMany(newSlotsArray);
            
        } else if (totalSlots < currentTotal) {
            // Agar Manager ne capacity kam ki hai -> Khali slots delete karo
            const slotsToRemove = currentTotal - totalSlots;
            
            // Sirf wahi slots dhundo jo 'isOccupied: false' (khali) hain
            const unoccupiedSlots = await Slot.find({ isOccupied: false }).limit(slotsToRemove);
            
            // Agar jitne delete karne hain utne khali slots nahi mile (yaani gaadiyan khadi hain)
            if (unoccupiedSlots.length < slotsToRemove) {
                return res.status(400).json({ 
                    message: "Cannot reduce capacity right now! Too many slots are currently occupied by vehicles." 
                });
            }
            
            // Khali slots delete kar do
            const idsToRemove = unoccupiedSlots.map(slot => slot._id);
            await Slot.deleteMany({ _id: { $in: idsToRemove } });
        }

        res.status(200).json({ message: `Success! Total parking slots updated to ${totalSlots}` });

    } catch (err) {
        console.error("Update Slots Error:", err);
        res.status(500).json({ message: 'Internal Server Error while updating slots' });
    }
});
module.exports = router;