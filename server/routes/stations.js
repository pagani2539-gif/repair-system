const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stations');
const { requirePermission } = require('../middlewares/auth');

// Routes
router.get('/', stationController.getUniqueStations);
router.get('/details', stationController.getStationDetails);
router.get('/health', stationController.getStationHealth);
router.get('/:id/areas', stationController.getStationAreas);
router.post('/', stationController.createStation);
router.post('/:id/areas', stationController.createStationArea);
router.delete('/:id', requirePermission('delete.stations'), stationController.deleteStation);
router.patch('/:id', stationController.updateStation);

module.exports = router;
