const { validateTransferEvent } = require('./utils');

const createTransferEventsService = (database) => ({
  
  async processTransfers(transferList) {
    let invalid = 0;
    const validEvents = [];

    for (const event of transferList) {
      const validation = validateTransferEvent(event);

      if (!validation.isValid) {
        invalid++;
        continue;
      }

      validEvents.push(event);
    }

    if (validEvents.length === 0) {
      return { inserted: 0, duplicates: 0, invalid };
    }

    const result = await database.bulkCreate(validEvents);

    return {
      inserted: result.inserted,
      duplicates: result.duplicates,
      invalid
    };
  },

  async getStationSummary(stationId) {
    return database.getStationSummary(stationId);
  }

});

module.exports = createTransferEventsService;