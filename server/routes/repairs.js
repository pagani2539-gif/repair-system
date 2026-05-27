const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairs');
const multer = require('multer');
const path = require('path');

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes
router.get('/stats', repairController.getStats);
router.get('/unread-count', repairController.getUnreadCount);
router.get('/', repairController.getAllRepairs);
router.post('/', upload.array('images', 4), repairController.createRepair);
router.post('/claim', upload.array('images', 4), repairController.createClaim);

router.get('/:id', repairController.getRepairById);
router.patch('/:id', repairController.updateRepair);
router.patch('/:id/status', repairController.updateStatus);
router.patch('/:id/read', repairController.markAsRead);
router.delete('/remove/:id', repairController.deleteRepair);
router.post('/:id/replace-device', repairController.replaceDevice);

module.exports = router;
