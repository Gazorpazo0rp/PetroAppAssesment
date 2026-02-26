module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'transferEventsService.js',
    'transferEventsController.js',
    'PostgresqlDB.js',
    'utils.js',
  ],
};
