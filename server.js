const express = require('express');
const DatabaseInterface = require('./database');
const { validateTransferEventList } = require('./utils');

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize database
app.listen(PORT, async () => {
    try {
        await DatabaseInterface.createDatabase(process.env.DB_NAME);
        const connected = await DatabaseInterface.connect();
        
        if (!connected) {
            console.error('Failed to connect to database. Shutting down.');
            process.exit(1);
        }
        
        console.log(`Server is listening at http://localhost:${PORT}`);
    } catch (err) {
        console.error('Database initialization failed:', err.message);
        process.exit(1);
    }
});


app.post('/transfers', async (req, res) => {
    try {
        const validation = validateTransferEventList(req.body);
        
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.message });
        }
        
        let inserted = 0;
        let duplicates = 0;
        
        for (const transferEvent of req.body) {
            const result = await DatabaseInterface.create(transferEvent);
            if (result === 1) {
                inserted++;
            } else if (result === 0) {
                duplicates++;
            }
        }
        
        res.status(201).json({
            inserted,
            duplicates
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/stations/:station_id/summary', async (req, res) => {
    try {
        const summary = await DatabaseInterface.getStationSummary(req.params.station_id);
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

