const roleService = require('../services/role.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await roleService.getAllRoles({ page, limit, search });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const role = await roleService.getRoleById(id);
    res.json(serializeBigInt(role));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json(serializeBigInt(role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const role = await roleService.updateRole(id, req.body);
    res.json(serializeBigInt(role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await roleService.deleteRole(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function assignPermissions(req, res) {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const result = await roleService.assignPermissionsToRole(id, permissionIds);
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function removePermission(req, res) {
  try {
    const { id, permissionId } = req.params;
    const result = await roleService.removePermissionFromRole(id, permissionId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function assignToUser(req, res) {
  try {
    const { userId, roleId } = req.body;
    const result = await roleService.assignRoleToUser(userId, roleId);
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function removeFromUser(req, res) {
  try {
    const { userId, roleId } = req.body;
    const result = await roleService.removeRoleFromUser(userId, roleId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getUserRoles(req, res) {
  try {
    const { userId } = req.params;
    const roles = await roleService.getUserRoles(userId);
    res.json(serializeBigInt(roles));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function getUserPermissions(req, res) {
  try {
    const { userId } = req.params;
    const permissions = await roleService.getUserPermissions(userId);
    res.json(serializeBigInt(permissions));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  assignPermissions,
  removePermission,
  assignToUser,
  removeFromUser,
  getUserRoles,
  getUserPermissions,
};
