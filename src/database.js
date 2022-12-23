import { config } from "dotenv";
import pg from "pg";

config();

const connection = new pg.Pool({
    connectionString: process.env.DATABASE_URL
    // ssl: true
});

export default connection;