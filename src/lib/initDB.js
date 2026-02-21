process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function initDB() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("Connected to Postgres!");

        // Create qsnap_users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS qsnap_users (
        id VARCHAR(255) PRIMARY KEY,
        password VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        grade VARCHAR(50),
        remaining_minutes INT DEFAULT 120,
        answer_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("qsnap_users created");

        // Create qsnap_questions table
        await client.query(`
      CREATE TABLE IF NOT EXISTS qsnap_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(255),
        student_grade VARCHAR(50),
        request_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        image_b64 TEXT,
        meeting_url VARCHAR(1000),
        tutor_reply_text TEXT,
        tutor_reply_image_b64 TEXT,
        tutor_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        hide_for_student BOOLEAN DEFAULT FALSE,
        hide_for_tutor BOOLEAN DEFAULT FALSE
      );
    `);
        console.log("qsnap_questions created");

    } catch (err) {
        console.error("DB Init Error:", err);
    } finally {
        await client.end();
    }
}

initDB();
