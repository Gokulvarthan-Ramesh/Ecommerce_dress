const { execSync } = require('child_process');
try {
  execSync('npx.cmd prisma migrate dev --name phase39', { stdio: 'inherit' });
} catch (e) {
  console.error(e);
}
