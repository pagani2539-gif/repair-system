const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrders');

router.get('/', poController.getAllPOs);
router.post('/auto-generate', poController.triggerAutoPO);
router.get('/:id', poController.getPOById);
router.post('/', poController.createPO);
router.patch('/:id', poController.updatePO);
router.delete('/:id', poController.deletePO);
router.post('/:id/receive', poController.receivePO);

module.exports = router;
