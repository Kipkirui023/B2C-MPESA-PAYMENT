require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));


const express = require("express");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false
}));

// Login page route
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// Login POST request
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        req.session.authenticated = true;
        return res.redirect("/dashboard");
    }

    res.send("Invalid login. <a href='/login'>Try again</a>");
});

// Protected Route
app.get("/dashboard", (req, res) => {
    if (!req.session.authenticated) {
        return res.redirect("/login");
    }
    res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));


// M-Pesa credentials
const config = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_BUSINESS_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackURL: process.env.MPESA_CALLBACK_URL
};

// Get access token
async function getAccessToken() {
  try {
    const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    
    const response = await axios.get(
      process.env.MPESA_ENVIRONMENT === 'sandbox' 
        ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw error;
  }
}

// Generate timestamp and password - FIXED VERSION
function generatePassword() {
  // Create timestamp in the correct format: YYYYMMDDHHMMSS
  const now = new Date();
  const timestamp = 
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  
  console.log('🔍 DEBUG - Generated Timestamp:', timestamp);
  
  const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64');
  
  console.log('🔍 DEBUG - Generated Password:', password);
  
  return { password, timestamp };
}

// Initiate STK Push
app.post('/api/initiate-payment', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    
    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone and amount are required' });
    }

    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    // Format phone number (2547...)
    const formattedPhone = phone.startsWith('0') ? `254${phone.slice(1)}` : 
                           phone.startsWith('+') ? phone.slice(1) : phone;

    const stkPushData = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: config.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: config.callbackURL,
      AccountReference: 'Test Payment',
      TransactionDesc: 'Payment for services'
    };

    const response = await axios.post(
      process.env.MPESA_ENVIRONMENT === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Payment initiation error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || 'Payment initiation failed'
    });
  }
});

// Callback endpoint for M-Pesa
app.post('/callback', (req, res) => {
  console.log('M-Pesa Callback:', JSON.stringify(req.body, null, 2));
  
  // Process the callback data
  const callbackData = req.body;
  
  if (callbackData.Body.stkCallback.ResultCode === 0) {
    console.log('Payment successful:', callbackData.Body.stkCallback);
    // Update your database here
  } else {
    console.log('Payment failed:', callbackData.Body.stkCallback.ResultDesc);
  }
  
  res.status(200).send('Callback received');
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('M-Pesa Payment App is ready!');
});