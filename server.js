require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const logFile = path.join(__dirname, 'payment_logs.json');

// Middleware amélioré
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://votre-domaine.com', 'https://affareparma-github-io-2.onrender.com']
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'));

// Logger des transactions
const logTransaction = async (data) => {
  const logData = {
    timestamp: new Date().toISOString(),
    ...data
  };
  
  fs.appendFileSync(logFile, JSON.stringify(logData) + '\n');
};

// Vérification initiale
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    stripe: !!process.env.STRIPE_SECRET_KEY,
    environment: process.env.NODE_ENV 
  });
});

// Routes améliorées
app.get('/config', (req, res) => {
  res.json({ 
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    apiVersion: '2023-08-16' // Version API Stripe fixe
  });
});

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, email, name } = req.body;

    // Validation renforcée
    if (!amount || isNaN(amount) || !email || !name) {
      return res.status(400).json({ 
        error: 'Paramètres invalides',
        details: {
          amount: typeof amount,
          email: typeof email,
          name: typeof name
        }
      });
    }

    // Création du client avec plus de métadonnées
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        app: 'Patient Sécurisé',
        platform: 'Web'
      }
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Conversion en centimes
      currency: 'eur',
      customer: customer.id,
      description: `Paiement Premium - ${name}`,
      metadata: {
        customer_name: name,
        service: 'Patient Sécurisé Premium'
      },
      payment_method_types: ['card'],
      receipt_email: email // Envoi automatique du reçu
    });

    // Journalisation détaillée
    await logTransaction({
      type: 'payment_intent_created',
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      customer: customer.id,
      status: paymentIntent.status
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
      customerId: customer.id
    });

  } catch (error) {
    console.error('Erreur Stripe:', error);
    
    await logTransaction({
      type: 'error',
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({ 
      error: 'Erreur de traitement du paiement',
      ...(process.env.NODE_ENV !== 'production' && { 
        details: error.message,
        stack: error.stack 
      })
    });
  }
});

// Nouvelle route pour vérifier les paiements
app.get('/payment/:id', async (req, res) => {
  try {
    const payment = await stripe.paymentIntents.retrieve(req.params.id);
    
    res.json({
      status: payment.status,
      amount: payment.amount / 100, // Conversion en euros
      currency: payment.currency,
      customer: payment.customer,
      created: new Date(payment.created * 1000),
      charges: payment.charges.data.map(c => ({
        amount: c.amount / 100,
        receipt_url: c.receipt_url,
        status: c.status
      }))
    });
  } catch (error) {
    res.status(404).json({ error: 'Paiement non trouvé' });
  }
});

// Webhook pour les événements Stripe (optionnel mais recommandé)
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gestion des événements
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await logTransaction({
        type: 'payment_succeeded',
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        customer: paymentIntent.customer
      });
      break;
      
    case 'payment_intent.failed':
      const failedIntent = event.data.object;
      await logTransaction({
        type: 'payment_failed',
        payment_intent_id: failedIntent.id,
        error: failedIntent.last_payment_error?.message
      });
      break;
  }

  res.json({ received: true });
});

// Gestion des erreurs améliorée
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  fs.appendFileSync(logFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'server_error',
    error: err.message,
    stack: err.stack,
    path: req.path
  }) + '\n');

  res.status(500).json({ 
    error: 'Erreur serveur',
    requestId: req.id
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // Créer le fichier de logs s'il n'existe pas
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
  }
  
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mode Stripe: ${process.env.STRIPE_SECRET_KEY?.includes('test') ? 'TEST' : 'PRODUCTION'}`);
});