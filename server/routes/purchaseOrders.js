const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrders');
const { requirePermission } = require('../middlewares/auth');

router.get('/', poController.getAllPOs);
router.get('/vendors', poController.getVendors);
router.post('/auto-generate', poController.triggerAutoPO);
router.get('/:id', poController.getPOById);
router.post('/', poController.createPO);
router.patch('/:id', poController.updatePO);
router.patch('/:id/company', poController.updatePOCompany);
router.delete('/:id', requirePermission('delete.purchase_orders'), poController.deletePO);
router.post('/:id/receive', poController.receivePO);

module.exports = router;
