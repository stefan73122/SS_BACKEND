const clientService = require('../services/client.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search, type } = req.query;
    const result = await clientService.getAllClients({ page, limit, search, type });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const client = await clientService.getClientById(id);
    res.json(serializeBigInt(client));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const client = await clientService.createClient(req.body);
    res.status(201).json(serializeBigInt(client));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const client = await clientService.updateClient(id, req.body);
    res.json(serializeBigInt(client));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await clientService.deleteClient(id);
    res.json(result);
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
};
