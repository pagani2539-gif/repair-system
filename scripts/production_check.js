const fs = require('fs');
const path = require('path');

require('../server/utils/loadEnv')();

const root = path.join(__dirname, '..');
const checks = [];

const addCheck = (name, ok, detail) => {
  checks.push({ name, ok, detail });
};

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

addCheck('NODE_ENV=production', process.env.NODE_ENV === 'production', `NODE_ENV=${process.env.NODE_ENV || '(empty)'}`);
addCheck('JWT_SECRET is set', Boolean(process.env.JWT_SECRET), 'Required for production auth tokens');
addCheck(
  'JWT_SECRET is not placeholder',
  process.env.JWT_SECRET && process.env.JWT_SECRET !== 'replace-with-a-long-random-secret',
  'Use a long random value'
);
addCheck('server/.env exists', exists('server/.env'), 'Local production environment file');
addCheck('client/dist exists', exists('client/dist/index.html'), 'Run npm.cmd run build in client');
addCheck('production database exists', exists('server/database/repair_system.db'), 'SQLite production database');
addCheck('backup directory exists', exists('server/database/backups'), 'Database backup location');
addCheck('server dependencies installed', exists('server/node_modules'), 'Run npm.cmd install in server');
addCheck('client dependencies installed', exists('client/node_modules'), 'Run npm.cmd install in client');
addCheck('PM2 config exists', exists('ecosystem.config.cjs'), 'Use pm2 start ecosystem.config.cjs');

let failed = 0;
for (const check of checks) {
  const status = check.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.name} - ${check.detail}`);
  if (!check.ok) failed += 1;
}

if (failed > 0) {
  console.error(`Production check failed: ${failed} issue(s) found.`);
  process.exit(1);
}

console.log('Production check passed.');
