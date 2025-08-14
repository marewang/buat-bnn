// api/_utils/parseBody.js
module.exports = async function parseBody(req) {
  if (req.method === 'GET' || req.method === 'DELETE') return null;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
};