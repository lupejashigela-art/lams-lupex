require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'LAMS v2.0',
    business: process.env.BUSINESS_NAME || 'MR_LUPEX99',
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/farmers', require('./routes/farmers'));
app.use('/api/buyers', require('./routes/buyers'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/lots', require('./routes/lots'));
app.use('/api/audit', require('./routes/audit'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`LAMS v2.0 API running on port ${PORT}`);
  console.log(`Business: ${process.env.BUSINESS_NAME || 'MR_LUPEX99'}`);
});
