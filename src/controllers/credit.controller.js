const creditService = require('../services/credit.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAllCreditPayments(req, res) {
  try {
    const { page, limit, status, clientId, sortBy } = req.query;

    const result = await creditService.getAllCreditPayments({
      page,
      limit,
      status,
      clientId,
      sortBy,
    });

    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getCreditSummary(req, res) {
  try {
    const summary = await creditService.getCreditSummary();
    res.json(serializeBigInt(summary));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function markPaymentAsPaid(req, res) {
  try {
    const { id } = req.params;
    const paymentTerm = await creditService.markPaymentAsPaid(id);
    res.json(serializeBigInt(paymentTerm));
  } catch (error) {
    if (error.message === 'Término de pago no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllCreditPayments,
  getCreditSummary,
  markPaymentAsPaid,
};
