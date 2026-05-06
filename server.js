const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/parkcar')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// --- ROUTES ---
app.use('/api/parking', require('./routes/parking'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin')); // YEH NAYI LINE HAI

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));