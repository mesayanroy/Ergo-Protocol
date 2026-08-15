import express from 'express';
import apiRouter from './routes/index.js';
import { ergoIndexer } from './services/indexer.js';

const app = express();
const port = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Service index. This is an API-only server — there is no UI here, so opening the
// root in a browser lists what is available instead of a bare 404.
app.get('/', (req, res) => {
  res.json({
    service: 'Ergo Protocol API',
    status: 'ok',
    network: process.env.NEXT_PUBLIC_NETWORK || 'testnet',
    endpoints: [
      '/health',
      '/api/markets',
      '/api/positions',
      '/api/proposals',
      '/api/oracle',
      '/api/auctions',
      '/api/backstop',
      '/api/protocol',
      '/api/health-factor',
      '/api/compliance',
      '/api/auth',
      '/api/faucet',
      '/api/admin'
    ]
  });
});

app.listen(port, () => {
  console.log(`Ergo Protocol API Server running on port ${port}`);
  ergoIndexer.start().catch(err => {
    console.error('Indexer failed to start:', err);
  });
});

export default app;