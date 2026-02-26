const express = require('express');

module.exports = (createTransferEventsController) => {
  const router = express.Router();

  router.post('/transfers', createTransferEventsController.createTransfers);
  router.get('/stations/:station_id/summary', createTransferEventsController.getStationSummary);

  return router;
};