const createTransferEventsController = require('./transferEventsController');
const createTransferEventsService = require('./transferEventsService');

describe('TransferEventsController', () => {
    let mockDatabase;
    let service;
    let controller;
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockDatabase = {
            create: jest.fn(),
            getStationSummary: jest.fn(),
        };
        service = createTransferEventsService(mockDatabase);
        controller = createTransferEventsController(service);

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('should process transfers and return results', async () => {
        mockDatabase.create
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(1);

        mockReq = {
            body: [
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                { event_id: 'EVT_002', station_id: 'STATION_B', amount: 200, status: 'approved', created_at: '2026-02-19T10:01:00Z' },
            ],
        };

        await controller.createTransfers(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({ inserted: 2, duplicates: 0, invalid: 0 });
    });

    it('should return station summary', async () => {
        mockDatabase.getStationSummary.mockResolvedValueOnce({
            station_id: 'STATION_A',
            total_approved_amount: 300,
            events_count: 2,
        });

        mockReq = {
            params: { station_id: 'STATION_A' },
        };

        await controller.getStationSummary(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
            station_id: 'STATION_A',
            total_approved_amount: 300,
            events_count: 2,
        });
    });
});
