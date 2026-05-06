const mongoose = require('mongoose');
const Slot = require('./models/Slot');
require('dotenv').config();

const seedSlots = async () => {
    try {
        // 1. Database se connect karein
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/parkcar');
        console.log("MongoDB connected for seeding...");

        // 2. Purane saare slots delete karein (taaki double na ho jayein)
        await Slot.deleteMany();
        console.log("Old slots cleared.");

        // 3. 10 naye slots banayein (A1 se A10 tak)
        const slots = [];
        for (let i = 1; i <= 10; i++) {
            slots.push({
                slotNumber: `A${i}`,
                isOccupied: false
            });
        }

        await Slot.insertMany(slots);
        console.log("10 Parking Slots (A1-A10) created successfully!");

        // 4. Seeding ke baad connection band karein
        process.exit();
    } catch (err) {
        console.error("Seeding Error:", err.message);
        process.exit(1);
    }
};

seedSlots();