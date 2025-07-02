require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

// Configuration CORS plus sécurisée
app.use(cors({
  origin: ['http://localhost:3000', 'https://affareparma-github-io.onrender.com/'], // À adapter
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de validation
const validateVendorId = (req, res, next) => {
  const { vendorId } = req.body;
  if (!vendorId || typeof vendorId !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'Un vendorId valide est requis'
    });
  }
  next();
};

// Endpoint amélioré
app.post('/create-setup-intent', validateVendorId, async (req, res) => {
  try {
    const { vendorId } = req.body;

    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      metadata: { vendor_id: vendorId }
    });

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });

  } catch (error) {
    console.error('Erreur Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du SetupIntent',
      details: error.message
    });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint non trouvé' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur en écoute sur le port ${PORT}`));