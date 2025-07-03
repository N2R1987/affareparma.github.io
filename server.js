require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route pour la page principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add_card.html'));
});

// ... (vos autres routes existantes)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
