const { validateTransferEventList } = require('./utils');

const createTransferEventsController = (transferService) => ({

  async createTransfers(req, res) {
    try {
      const validation = validateTransferEventList(req.body);

      if (!validation.isValid) {
        return res.status(400).json({ error: validation.message });
      }

      const result = await transferService.processTransfers(req.body);
      res.status(201).json(result);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getStationSummary(req, res) {
    try {
      const summary = await transferService.getStationSummary(
        req.params.station_id
      );

      res.json(summary);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

});

module.exports = createTransferEventsController;