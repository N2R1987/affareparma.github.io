// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.static('public')); // Contient add_card.html
app.use(express.json());

// Envoie la clé publique à l'app frontend
app.get('/config', (req, res) => {
  res.send({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Créer un SetupIntent
app.post('/create-setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId || undefined,
      usage: 'off_session',
    });

    res.send({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Sauvegarder le PaymentMethod
app.post('/save-payment-method', async (req, res) => {
  try {
    const { paymentMethodId, customerId } = req.body;

    // Optionnel : attacher la carte à un customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    res.send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
