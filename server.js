require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// 👉 Servir les fichiers statiques (ex: add_card.html)
app.use(express.static(path.join(__dirname, 'public')));

// 👉 Créer un SetupIntent
app.post('/create-setup-intent', async (req, res) => {
  const { vendorId } = req.body || {};

  if (!vendorId) {
    return res.status(400).json({ error: 'vendorId is required' });
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      metadata: { vendor_id: vendorId }
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Erreur Stripe SetupIntent:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend en ligne sur http://localhost:${PORT}`));
