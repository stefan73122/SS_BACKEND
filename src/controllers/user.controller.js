const userService = require('../services/user.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAllUsers(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await userService.getAllUsers({ page, limit, search });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.json(serializeBigInt(user));
  } catch (error) {
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(serializeBigInt(user));
  } catch (error) {
    if (error.message.includes('Ya existe')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.updateUser(id, req.body);
    res.json(serializeBigInt(user));
  } catch (error) {
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Ya existe')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);
    res.json(result);
  } catch (error) {
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function assignRole(req, res) {
  try {
    const { id } = req.params;
    const { roleId } = req.body;
    const result = await userService.assignRoleToUser(id, roleId);
    res.json(result);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('ya tiene')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function removeRole(req, res) {
  try {
    const { id, roleId } = req.params;
    const result = await userService.removeRoleFromUser(id, roleId);
    res.json(result);
  } catch (error) {
    if (error.message.includes('no tiene')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignRole,
  removeRole,
};
