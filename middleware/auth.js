const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  let token = req.header('x-auth-token') || req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trim();
    }

    // Match your controller's secret exactly
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attaches { id: "..." } to the request context
    req.user = decoded; 
    next();
  } catch (err) {
    console.error("❌ JWT Middleware Verification Failed:", err.message);
    res.status(401).json({ error: 'Token is not valid' });
  }
};
