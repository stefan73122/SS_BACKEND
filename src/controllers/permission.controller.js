const permissionService = require('../services/permission.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search, module } = req.query;
    const result = await permissionService.getAllPermissions({ page, limit, search, module });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const permission = await permissionService.getPermissionById(id);
    res.json(serializeBigInt(permission));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const permission = await permissionService.createPermission(req.body);
    res.status(201).json(serializeBigInt(permission));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const permission = await permissionService.updatePermission(id, req.body);
    res.json(serializeBigInt(permission));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await permissionService.deletePermission(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getByModule(req, res) {
  try {
    const grouped = await permissionService.getPermissionsByModule();
    res.json(serializeBigInt(grouped));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createBulk(req, res) {
  try {
    const { permissions } = req.body;
    const result = await permissionService.createBulkPermissions(permissions);
    res.status(201).json(serializeBigInt(result));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByModule,
  createBulk,
};
