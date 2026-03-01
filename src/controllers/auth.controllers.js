const authService = require('../services/auth.service');

async function register(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.register({ email, password });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  register,
  login,
};
