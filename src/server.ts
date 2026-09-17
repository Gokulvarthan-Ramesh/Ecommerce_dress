import app from './app';
import { ENV } from './config/env';
import { startScheduler } from './jobs/scheduler';

const port = parseInt(ENV.PORT, 10) || 5000;

app.listen(port, () => {
  console.log('====================================================');
  console.log('  E-Commerce API Server running in ' + ENV.NODE_ENV + ' mode');
  console.log('  Listening on: http://localhost:' + port);
  console.log('  Health Check: http://localhost:' + port + '/health');
  console.log('  API Endpoints: http://localhost:' + port + '/api/v1');
  console.log('====================================================');

  // Start background jobs
  startScheduler();
});
