const db = require('../database/init');
const https = require('https');
const querystring = require('querystring');

/**
 * Send a notification to LINE Notify
 * @param {string} category - 'repair' or 'stock'
 * @param {string} message - Message text to send
 */
const sendLineNotify = (category, message) => {
  const key = category === 'repair' ? 'line_token_repair' : 'line_token_stock';
  
  db.get('SELECT value FROM system_settings WHERE key = ?', [key], (err, row) => {
    if (err) {
      console.error('Failed to fetch LINE Notify token from DB:', err.message);
      return;
    }
    
    const token = row ? row.value : null;
    if (!token || token.trim() === '') {
      // LINE Notify is not configured/enabled for this category
      return;
    }
    
    const postData = querystring.stringify({ message });
    
    const options = {
      hostname: 'notify-api.line.me',
      port: 443,
      path: '/api/notify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`LINE Notify failed: Status ${res.statusCode}, Body: ${body}`);
        } else {
          console.log(`LINE Notify sent successfully to category: ${category}`);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('LINE Notify request error:', e.message);
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error('LINE Notify request timed out after 10s'));
    });

    req.write(postData);
    req.end();
  });
};

module.exports = { sendLineNotify };
