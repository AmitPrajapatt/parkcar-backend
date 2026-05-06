const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');

// 1. Get Analytics & Revenue
// 1. Advanced Analytics & Revenue
router.get('/analytics', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        
        // Populate ka use kiya taaki pata chale session kis user ka hai
        const sessions = await Session.find().populate('userId');
        
        let totalBilled = 0;
        let totalPaid = 0;
        let totalPending = 0;

        // Har ek session (booking) ko check karein
        sessions.forEach(session => {
            const fee = session.fee || 0;
            totalBilled += fee;

            // Agar user exist karta hai aur uska status 'paid' hai
            if (session.userId && session.userId.paymentStatus === 'paid') {
                totalPaid += fee;
            } else {
                totalPending += fee; // Agar unpaid hai toh dues mein daalo
            }
        });

        // Business Logic: Assume 20% is Platform/Maintenance Cost
        const operationalCostMargin = 0.20; 
        const netProfit = totalPaid - (totalPaid * operationalCostMargin);
        
        // Profit Ratio (Margin %)
        const profitRatio = totalPaid > 0 ? ((netProfit / totalPaid) * 100).toFixed(1) : 0;

        res.json({ 
            totalUsers, 
            totalSessions: sessions.length,
            totalRevenue: totalBilled,     // Total Billed
            totalPaid,                     // Total Collected
            totalPending,                  // Money stuck
            netProfit: Math.round(netProfit), // Final Profit
            profitRatio                    // Margin %
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Get All Users Table
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. Toggle Payment Status (Paid / Not Paid)
router.put('/users/:id/status', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.paymentStatus = user.paymentStatus === 'paid' ? 'unpaid' : 'paid';
        await user.save();
        res.json({ message: "Payment status updated", status: user.paymentStatus });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. Delete User
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        // Bonus: Aap chahein toh is user ke Sessions bhi delete karwa sakte hain yahan
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;