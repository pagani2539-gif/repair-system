const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairs');
const { uploadRepairImages } = require('../middlewares/upload');

// Routes
router.get('/stats', repairController.getStats);
router.get('/dashboard-stats', repairController.getDashboardStats);
router.get('/unread-count', repairController.getUnreadCount);
router.get('/', repairController.getAllRepairs);
router.post('/', uploadRepairImages, repairController.createRepair);
router.post('/claim', uploadRepairImages, repairController.createClaim);

router.get('/:id', repairController.getRepairById);
router.patch('/:id', repairController.updateRepair);
router.patch('/:id/status', repairController.updateStatus);
router.patch('/:id/read', repairController.markAsRead);
router.delete('/remove/:id', repairController.deleteRepair);
router.post('/:id/replace-device', repairController.replaceDevice);

module.exports = router;
