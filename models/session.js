const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: { 
        type: String // Ya ObjectId agar aapne waise set kiya hai
    },
    carNumber: { 
        type: String, 
        required: true 
    },
    ownerName: { 
        type: String, 
        required: true 
    },
    slotId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Slot' 
    },
    entryTime: { 
        type: Date, 
        default: Date.now 
    },
    exitTime: { 
        type: Date 
    },
    fee: { 
        type: Number, 
        default: 0 
    },
    // 👇 YEH WALI LINE MISSING THI ISLIYE SAVE NAHI HO RAHA THA 👇
    paymentStatus: { 
        type: String, 
        enum: ['paid', 'unpaid'], 
        default: 'unpaid' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);