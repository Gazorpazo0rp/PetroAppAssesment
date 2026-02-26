const { validateTransferEvent } = require('./utils');

const createTransferEventsService = (database) => ({
  
  async processTransfers(transferList) {
    let inserted = 0;
    let duplicates = 0;
    let invalid = 0;

    for (const transferEvent of transferList) {
      const eventValidation = validateTransferEvent(transferEvent);

      if (!eventValidation.isValid) {
        invalid++;
        continue;
      }

      const result = await database.create(transferEvent);

      if (result === 1) inserted++;
      else duplicates++;
    }

    return { inserted, duplicates, invalid };
  },

  async getStationSummary(stationId) {
    return database.getStationSummary(stationId);
  }

});

module.exports = createTransferEventsService;