// Simple health check endpoint for Vercel
module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
};