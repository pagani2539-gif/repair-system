const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings');
const { uploadCompanyLogo } = require('../middlewares/upload');

// Companies
router.get('/companies', settingsController.getCompanies);
router.post('/companies', settingsController.createCompany);
router.get('/companies/:id', settingsController.getCompanyById);
router.put('/companies/:id', settingsController.updateCompany);
router.delete('/companies/:id', settingsController.deleteCompany);
router.patch('/companies/:id/default', settingsController.setDefaultCompany);

// Logos
router.get('/logos', settingsController.getLogos);
router.post('/logos', uploadCompanyLogo, settingsController.uploadLogo);
router.patch('/logos/:id/default', settingsController.setDefaultLogo);
router.delete('/logos/:id', settingsController.deleteLogo);

module.exports = router;
