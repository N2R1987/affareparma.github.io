// server.js - Version corrigée et optimisée
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

// Initialisations
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const publicDir = path.join(__dirname, 'public');

// Vérification/Création du dossier public
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
  console.log('Dossier public créé');
}

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://affareparma.github.io-2.onrender.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(publicDir));

// Route pour vérifier l'accès aux fichiers statiques
app.get('/check-files', (req, res) => {
  try {
    const files = fs.readdirSync(publicDir);
    res.json({
      status: 'success',
      files: files,
      publicDir: publicDir
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      publicDir: publicDir
    });
  }
});

// Route principale
app.get('/', (req, res) => {
  const filePath = path.join(publicDir, 'add_card.html');
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send(`
      <h1>Fichier non trouvé</h1>
      <p>Le fichier add_card.html n'existe pas dans ${publicDir}</p>
      <p>Fichiers présents: ${fs.readdirSync(publicDir).join(', ')}</p>
    `);
  }
});

// Vos routes Stripe existantes
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

app.post('/create-setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId || undefined,
      usage: 'off_session',
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    console.error('Erreur SetupIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/save-payment-method', async (req, res) => {
  try {
    const { paymentMethodId, customerId } = req.body;
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur sauvegarde:', err);
    res.status(500).json({ error: err.message });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erreur serveur!');
});

// Démarrage
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Dossier public: ${publicDir}`);
  console.log(`Contenu du dossier public: ${fs.readdirSync(publicDir).join(', ')}`);
});
