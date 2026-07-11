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

app.listen(port, () => {
  console.log(`Ergo Protocol API Server running on port ${port}`);
  ergoIndexer.start().catch(err => {
    console.error('Indexer failed to start:', err);
  });
});

export default app;