import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.set('trust proxy', 1);
// app.use(globalLimiter);

import path from 'path';

// Security Headers (allow Cashfree JS SDK and modal iframe)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Serve test-payment playground directly (Disabled in production for security)
app.get(['/test-payment', '/test-payment.html'], (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Test playground is disabled in production.' });
  }
  res.sendFile(path.join(process.cwd(), 'test-payment.html'));
});


// CORS configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-signature', 'x-webhook-timestamp'],
  })
);

// Logging
app.use(morgan('dev'));

// Capture raw body for Cashfree webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res: Response, buf: Buffer) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ecommerce-api',
  });
});

// API Routes
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// 404 Catch-All Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
