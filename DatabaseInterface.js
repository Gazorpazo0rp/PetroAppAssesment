class DatabaseInterface {
  async connect() {
    throw new Error("connect() not implemented");
  }

  async disconnect() {
    throw new Error("disconnect() not implemented");
  }

  async create() {
    throw new Error("create() not implemented");
  }

  async getStationSummary() {
    throw new Error("getStationSummary() not implemented");
  }
}

module.exports = DatabaseInterface;