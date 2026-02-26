require('dotenv').config();
const DatabaseInterface = require("./DatabaseInterface");

const { Pool } = require('pg');

class PostgresqlDB extends DatabaseInterface {
    constructor(tableName = 'TransferEvents') {
        super();
        this.pool = null;
        this.tableName = tableName;
    }

    async createDatabase(dbName) {
        try {
            const adminPool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: 'postgres',
            });

            await adminPool.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database '${dbName}' created successfully`);
            await adminPool.end();
            return true;
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log(`Database '${dbName}' already exists`);
                return true;
            }
            console.error('Failed to create database:', err.message);
            return false;
        }
    }

    async connect() {
        try {
            this.pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            });

            const client = await this.pool.connect();
            console.log('Database connected successfully');
            client.release();
            return true;
        } catch (err) {
            console.error('Failed to connect to database:', err.message);
            return false;
        }
    }

     async initializeTables() {
        const transferEventsSchema = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                event_id VARCHAR(100) PRIMARY KEY,
                station_id VARCHAR(100) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await this.createTable(this.tableName, transferEventsSchema);
    }

    async createTable(tableName, schema) {
        try {
            await this.pool.query(schema);
            console.log(`Table '${tableName}' created successfully`);
            return true;
        } catch (err) {
            console.error(`Failed to create table '${tableName}':`, err.message);
            return false;
        }
    }

    async create(data) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
            
            await client.query(query, values);
            await client.query('COMMIT');
            return 1;
        } catch (err) {
            await client.query('ROLLBACK');
            if (err.code === '23505') {
                return 0;
            }
            throw err;
        } finally {
            client.release();
        }
    }

    async read(conditions = {}) {
        try {
            let query = `SELECT * FROM ${this.tableName}`;
            const values = [];
            const keys = Object.keys(conditions);

            if (keys.length > 0) {
                const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
                query += ` WHERE ${whereClause}`;
                values.push(...Object.values(conditions));
            }

            const result = await this.pool.query(query, values);
            return result.rows;
        } catch (err) {
            console.error('Read operation failed:', err.message);
            throw err;
        }
    }

    async update(id, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
            
            values.push(id);
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (err) {
            console.error('Update operation failed:', err.message);
            throw err;
        }
    }

    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
            const result = await this.pool.query(query, [id]);
            return result.rows[0];
        } catch (err) {
            console.error('Delete operation failed:', err.message);
            throw err;
        }
    }

    async disconnect() {
        try {
            await this.pool.end();
            console.log('Database disconnected');
            return true;
        } catch (err) {
            console.error('Failed to disconnect:', err.message);
            return false;
        }
    }

    async getStationSummary(stationId) {
        try {
            const query = `
                SELECT 
                    $1 as station_id,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved_amount,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as events_count
                FROM TransferEvents
                WHERE station_id = $1
            `;
            
            const result = await this.pool.query(query, [stationId]);
            return result.rows[0];
        } catch (err) {
            console.error('getStationSummary operation failed:', err.message);
            throw err;
        }
    }
}

module.exports = PostgresqlDB;
