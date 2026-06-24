const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contracts');
const { requirePermission } = require('../middlewares/auth');

// Routes
router.get('/', contractController.getAllContracts);
router.post('/', contractController.createContract);
router.delete('/:id', requirePermission('delete.contracts'), contractController.deleteContract);
router.patch('/:id', contractController.updateContract);

module.exports = router;
