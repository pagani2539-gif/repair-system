const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions');
const { uploadReturnImage } = require('../middlewares/upload');

router.get('/latest', transactionsController.getLatestTransaction);
router.get('/', transactionsController.getAllTransactions);
router.post('/add-stock', transactionsController.addStock);
router.post('/borrow', transactionsController.borrowItem);
router.post('/return', uploadReturnImage, transactionsController.returnItem);
router.delete('/:id', transactionsController.deleteTransaction);

module.exports = router;
