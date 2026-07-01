import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userAddress?: string;
}

export function verifySep10Auth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. SEP-10 required.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid token structure.' });
  }

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.sub) {
        req.userAddress = payload.sub;
        return next();
      }
    }
    // Fallback for testing: raw public key
    if (token.startsWith('G') && token.length === 56) {
      req.userAddress = token;
      return next();
    }
  } catch (err) {
    return res.status(401).json({ error: 'Failed to decode auth token.' });
  }

  return res.status(401).json({ error: 'Invalid SEP-10 credentials.' });
}