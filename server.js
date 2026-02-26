const express = require('express');
const PostgresqlDB = require('./PostgresqlDB');
const createTransferEventsService = require('./transferEventsService');
const createTransferEventsController = require('./transferEventsController');
const createTransferEventsRoutes = require('./transferEventsRouter');

const PORT = 3000;

async function start() {
  try {
    const app = express();
    app.use(express.json());

    console.log('Initializing database connection...');

    // Create DB instance and connect
    const database = new PostgresqlDB();

    const connected = await database.connect();

    if (!connected) {
      console.error('Failed to connect to database. Shutting down.');
      process.exit(1);
    }

    // Inject dependencies
    const transferEventsService = createTransferEventsService(database);
    const transferEventsController = createTransferEventsController(transferEventsService);

    // Create router with controller
    const transferRoutes = createTransferEventsRoutes(transferEventsController);

    // Mount router
    app.use(transferRoutes); // No prefix, routes already include full path

    app.listen(PORT, () => {
      console.log(`Server started and is listening at http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  }
}

start();