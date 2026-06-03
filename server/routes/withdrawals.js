const express = require('express');
const router = express.Router();
const withdrawalsController = require('../controllers/withdrawals');

router.get('/', withdrawalsController.getAllWithdrawals);
router.get('/:id', withdrawalsController.getWithdrawalById);
router.post('/', withdrawalsController.createWithdrawal);
router.put('/:id/items/:itemId/serial-numbers', withdrawalsController.updateItemSerialNumbers);
router.delete('/:id', withdrawalsController.deleteWithdrawal);

module.exports = router;
