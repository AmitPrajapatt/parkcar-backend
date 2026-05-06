const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Agar aap hashing use kar rahe hain
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// --- 1. REGISTER API (Updated to handle Managers) ---
router.post('/register', async (req, res) => {
    try {
        // Frontend se aane wale saare naye fields yahan receive kiye
        const { name, email, password, phone, role, assignedSlot } = req.body;

        // Check if email already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Password Hashing (Security)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user/manager
        user = new User({
            name,
            email,
            password: hashedPassword,
            phone: phone || '',
            role: role || 'user', // Agar role nahi bheja toh default 'user' banega
            assignedSlot: assignedSlot || '' // Sirf managers ke liye
        });

        await user.save();
        res.status(201).json({ message: 'Account created successfully!' });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// --- 2. LOGIN API ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid Email or Password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid Email or Password' });

        const payload = { id: user._id, role: user.role };
        
        // Ensure you have a JWT_SECRET in your .env file
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1d' });

        res.json({
            message: 'Login Successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// --- 3. GET PROFILE API ---
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if(!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// --- 4. UPDATE PROFILE API ---
router.put('/profile/:id', async (req, res) => {
    try {
        const { name, email, phone, oldPassword, newPassword } = req.body;
        let user = await User.findById(req.params.id);

        if(!user) return res.status(404).json({ message: 'User not found' });

        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;

        // Agar user ne password change karne ki request ki hai
        if (oldPassword && newPassword) {
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Incorrect Old Password!' });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        res.json({ message: 'Profile updated successfully' });

    } catch (err) {
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

module.exports = router;