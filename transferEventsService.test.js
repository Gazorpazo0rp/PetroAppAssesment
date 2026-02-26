const createTransferEventsService = require('./transferEventsService');

describe('TransferEventsService', () => {
    let mockDatabase;
    let service;

    beforeEach(() => {
        mockDatabase = {
            create: jest.fn(),
            getStationSummary: jest.fn(),
        };
        service = createTransferEventsService(mockDatabase);
    });

    // Test 1: Batch insert returns correct inserted/duplicates
    describe('processTransfers', () => {
        it('should return correct inserted and duplicates count', async () => {
            mockDatabase.create
                .mockResolvedValueOnce(1) // Success
                .mockResolvedValueOnce(1) // Success
                .mockResolvedValueOnce(0); // Duplicate

            const transfers = [
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                { event_id: 'EVT_002', station_id: 'STATION_B', amount: 200, status: 'approved', created_at: '2026-02-19T10:01:00Z' },
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
            ];

            const result = await service.processTransfers(transfers);

            expect(result).toEqual({ inserted: 2, duplicates: 1, invalid: 0 });
        });

        // Test 2: Duplicate event doesn't change totals
        it('should not change totals when processing duplicate', async () => {
            mockDatabase.create
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(0); // Duplicate

            const transfers = [
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 150.50, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 150.50, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
            ];

            const result1 = await service.processTransfers([transfers[0]]);
            const result2 = await service.processTransfers([transfers[1]]);

            expect(result1.inserted).toBe(1);
            expect(result2.duplicates).toBe(1);
            expect(result2.inserted).toBe(0);
        });

        // Test 3: Out-of-order arrival still produces same totals
        it('should produce same totals regardless of order', async () => {
            mockDatabase.create.mockResolvedValue(1);

            const transfersOrderA = [
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                { event_id: 'EVT_002', station_id: 'STATION_A', amount: 200, status: 'approved', created_at: '2026-02-19T10:01:00Z' },
                { event_id: 'EVT_003', station_id: 'STATION_A', amount: 150, status: 'approved', created_at: '2026-02-19T10:02:00Z' },
            ];

            const transfersOrderB = [
                { event_id: 'EVT_003', station_id: 'STATION_A', amount: 150, status: 'approved', created_at: '2026-02-19T10:02:00Z' },
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                { event_id: 'EVT_002', station_id: 'STATION_A', amount: 200, status: 'approved', created_at: '2026-02-19T10:01:00Z' },
            ];

            const resultA = await service.processTransfers(transfersOrderA);
            const resultB = await service.processTransfers(transfersOrderB);

            expect(resultA.inserted).toBe(resultB.inserted);
            expect(resultA.inserted).toBe(3);
        });

        // Test 4: Concurrent ingestion of same IDs doesn't double count
        it('should not double count with concurrent requests', async () => {
            mockDatabase.create
                .mockResolvedValueOnce(1) // First request succeeds
                .mockResolvedValueOnce(0); // Second concurrent request gets duplicate

            const transfer = {
                event_id: 'EVT_CONCURRENT',
                station_id: 'STATION_A',
                amount: 500,
                status: 'approved',
                created_at: '2026-02-19T10:00:00Z'
            };

            // Simulate concurrent requests with same ID
            const [result1, result2] = await Promise.all([
                service.processTransfers([transfer]),
                service.processTransfers([transfer]),
            ]);

            expect(result1.inserted + result2.inserted).toBe(1);
            expect(result1.duplicates + result2.duplicates).toBe(1);
        });

        // Test 4b: Concurrent ingestion of 10 simultaneous requests
        it('should not double count with 10 concurrent requests', async () => {
            mockDatabase.create
                .mockResolvedValueOnce(1) // First request succeeds
                .mockResolvedValue(0); // All subsequent requests get duplicate

            const transfer = {
                event_id: 'EVT_CONCURRENT_10',
                station_id: 'STATION_A',
                amount: 500,
                status: 'approved',
                created_at: '2026-02-19T10:00:00Z'
            };

            // Simulate 10 concurrent requests with same ID
            const results = await Promise.all(
                Array.from({ length: 10 }, () => 
                    service.processTransfers([transfer])
                )
            );

            const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
            const totalDuplicates = results.reduce((sum, r) => sum + r.duplicates, 0);

            expect(totalInserted).toBe(1);
            expect(totalDuplicates).toBe(9);
        });

        // Test 4c: Two lists of transfers with one duplicate between them
        it('should handle two lists with one shared duplicate', async () => {
            mockDatabase.create
                .mockResolvedValueOnce(1) // EVT_001 succeeds
                .mockResolvedValueOnce(1) // EVT_002 succeeds
                .mockResolvedValueOnce(1) // EVT_003 succeeds in first list
                .mockResolvedValueOnce(1) // EVT_004 succeeds
                .mockResolvedValueOnce(1) // EVT_005 succeeds
                .mockResolvedValueOnce(0); // EVT_003 duplicate in second list

            const list1 = [
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                { event_id: 'EVT_002', station_id: 'STATION_A', amount: 200, status: 'approved', created_at: '2026-02-19T10:01:00Z' },
                { event_id: 'EVT_003', station_id: 'STATION_A', amount: 150, status: 'approved', created_at: '2026-02-19T10:02:00Z' },
            ];

            const list2 = [
                { event_id: 'EVT_003', station_id: 'STATION_A', amount: 150, status: 'approved', created_at: '2026-02-19T10:02:00Z' },
                { event_id: 'EVT_004', station_id: 'STATION_A', amount: 120, status: 'approved', created_at: '2026-02-19T10:03:00Z' },
                { event_id: 'EVT_005', station_id: 'STATION_A', amount: 180, status: 'approved', created_at: '2026-02-19T10:04:00Z' },
            ];

            const result1 = await service.processTransfers(list1);
            const result2 = await service.processTransfers(list2);

            expect(result1.inserted).toBe(3);
            expect(result1.duplicates).toBe(0);
            expect(result2.inserted).toBe(2);
            expect(result2.duplicates).toBe(1);
            expect(result1.inserted + result2.inserted).toBe(5);
        });

        // Test 4d: Two lists of transfers with one duplicate between them (concurrent)
        it('should handle two lists with one shared duplicate concurrently', async () => {
            mockDatabase.create
                .mockResolvedValueOnce(1) // EVT_001 succeeds
                .mockResolvedValueOnce(1) // EVT_002 succeeds
                .mockResolvedValueOnce(1) // EVT_003 succeeds
                .mockResolvedValueOnce(1) // EVT_004 succeeds
                .mockResolvedValueOnce(1) // EVT_005 succeeds
                .mockResolvedValueOnce(0); // EVT_003 duplicate

            const list1 = [
                { event_id: 'EVT_CONC_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                { event_id: 'EVT_CONC_002', station_id: 'STATION_A', amount: 200, status: 'approved', created_at: '2026-02-19T10:01:00Z' },
                { event_id: 'EVT_CONC_003', station_id: 'STATION_A', amount: 150, status: 'approved', created_at: '2026-02-19T10:02:00Z' },
            ];

            const list2 = [
                { event_id: 'EVT_CONC_003', station_id: 'STATION_A', amount: 150, status: 'approved', created_at: '2026-02-19T10:02:00Z' },
                { event_id: 'EVT_CONC_004', station_id: 'STATION_A', amount: 120, status: 'approved', created_at: '2026-02-19T10:03:00Z' },
                { event_id: 'EVT_CONC_005', station_id: 'STATION_A', amount: 180, status: 'approved', created_at: '2026-02-19T10:04:00Z' },
            ];

            // Process both lists concurrently
            const [result1, result2] = await Promise.all([
                service.processTransfers(list1),
                service.processTransfers(list2),
            ]);

            // Combined: 5 inserted, 1 duplicate
            const totalInserted = result1.inserted + result2.inserted;
            const totalDuplicates = result1.duplicates + result2.duplicates;

            expect(totalInserted).toBe(5);
            expect(totalDuplicates).toBe(1);
        });

        // Test 6: Validation failure behavior
        it('should count invalid records and skip processing', async () => {
            const transfers = [
                // Valid
                { event_id: 'EVT_001', station_id: 'STATION_A', amount: 100, status: 'approved', created_at: '2026-02-19T10:00:00Z' },
                // Invalid - missing status
                { event_id: 'EVT_002', station_id: 'STATION_A', amount: 200, created_at: '2026-02-19T10:01:00Z' },
                // Invalid - negative amount
                { event_id: 'EVT_003', station_id: 'STATION_A', amount: -50, status: 'approved', created_at: '2026-02-19T10:02:00Z' },
                // Invalid - bad date format
                { event_id: 'EVT_004', station_id: 'STATION_A', amount: 150, status: 'approved', created_at: 'invalid-date' },
            ];

            mockDatabase.create.mockResolvedValueOnce(1);

            const result = await service.processTransfers(transfers);

            expect(result.inserted).toBe(1);
            expect(result.invalid).toBe(3);
            expect(mockDatabase.create).toHaveBeenCalledTimes(1); // Only called for valid record
        });
    });

    // Test 5: Summary endpoint correctness per station
    describe('getStationSummary', () => {
        it('should return correct summary for station', async () => {
            const mockSummary = {
                station_id: 'STATION_A',
                total_approved_amount: 450.50,
                events_count: 3,
            };

            mockDatabase.getStationSummary.mockResolvedValueOnce(mockSummary);

            const result = await service.getStationSummary('STATION_A');

            expect(result).toEqual(mockSummary);
            expect(mockDatabase.getStationSummary).toHaveBeenCalledWith('STATION_A');
        });

        it('should return zero totals for station with no approved events', async () => {
            const mockSummary = {
                station_id: 'STATION_X',
                total_approved_amount: 0,
                events_count: 0,
            };

            mockDatabase.getStationSummary.mockResolvedValueOnce(mockSummary);

            const result = await service.getStationSummary('STATION_X');

            expect(result.total_approved_amount).toBe(0);
            expect(result.events_count).toBe(0);
        });
    });
});
