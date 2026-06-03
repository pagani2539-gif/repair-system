const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory');
const { uploadInventoryImage } = require('../middlewares/upload');

router.get('/stats', inventoryController.getStats);
router.get('/', inventoryController.getAllItems);
router.get('/:id', inventoryController.getItemById);
router.get('/:id/instances', inventoryController.getInstancesInStock);
router.post('/:id/serial-numbers', inventoryController.addInventorySerialNumbers);
router.post('/', uploadInventoryImage, inventoryController.createItem);
router.patch('/:id', uploadInventoryImage, inventoryController.updateItem);
router.delete('/:id', inventoryController.deleteItem);

module.exports = router;
