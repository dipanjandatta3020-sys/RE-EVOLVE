import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'applications.db');

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Database Setup ──
let db;

async function initDB() {
    const SQL = await initSqlJs();

    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

    // Load existing DB or create new
    if (existsSync(DB_PATH)) {
        const fileBuffer = readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Create table
    db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      fitnessLevel TEXT NOT NULL,
      primaryGoal TEXT NOT NULL,
      whyCoaching TEXT,
      timestamp TEXT NOT NULL
    )
  `);
    saveDB();
}

function saveDB() {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
}

// ── API Routes ──

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all applications
app.get('/api/applications', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM applications ORDER BY id DESC');
        const apps = [];
        while (stmt.step()) {
            apps.push(stmt.getAsObject());
        }
        stmt.free();
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// GET stats
app.get('/api/stats', (req, res) => {
    try {
        // Total
        const totalStmt = db.prepare('SELECT COUNT(*) as count FROM applications');
        totalStmt.step();
        const total = totalStmt.getAsObject().count;
        totalStmt.free();

        // Today's count
        const today = new Date().toISOString().slice(0, 10);
        const todayStmt = db.prepare('SELECT COUNT(*) as count FROM applications WHERE timestamp LIKE ?');
        todayStmt.bind([today + '%']);
        todayStmt.step();
        const todayCount = todayStmt.getAsObject().count;
        todayStmt.free();

        // Top goal
        let topGoal = null;
        const goalStmt = db.prepare('SELECT primaryGoal, COUNT(*) as cnt FROM applications GROUP BY primaryGoal ORDER BY cnt DESC LIMIT 1');
        if (goalStmt.step()) {
            topGoal = goalStmt.getAsObject().primaryGoal;
        }
        goalStmt.free();

        // Latest
        let latestTimestamp = null;
        const latestStmt = db.prepare('SELECT timestamp FROM applications ORDER BY id DESC LIMIT 1');
        if (latestStmt.step()) {
            latestTimestamp = latestStmt.getAsObject().timestamp;
        }
        latestStmt.free();

        res.json({ total, today: todayCount, topGoal, latestTimestamp });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// POST new application
app.post('/api/applications', (req, res) => {
    try {
        const { fullName, email, phone, fitnessLevel, primaryGoal, whyCoaching } = req.body;

        if (!fullName || !email || !phone || !fitnessLevel || !primaryGoal) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const timestamp = new Date().toISOString();
        db.run(
            'INSERT INTO applications (fullName, email, phone, fitnessLevel, primaryGoal, whyCoaching, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fullName, email, phone, fitnessLevel, primaryGoal, whyCoaching || '', timestamp]
        );
        saveDB();

        // Get the inserted ID
        const idStmt = db.prepare('SELECT last_insert_rowid() as id');
        idStmt.step();
        const id = idStmt.getAsObject().id;
        idStmt.free();

        res.status(201).json({ id, message: 'Application submitted successfully', timestamp });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save application' });
    }
});

// DELETE single application
app.delete('/api/applications/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Check if exists
        const checkStmt = db.prepare('SELECT id FROM applications WHERE id = ?');
        checkStmt.bind([parseInt(id)]);
        if (!checkStmt.step()) {
            checkStmt.free();
            return res.status(404).json({ error: 'Application not found' });
        }
        checkStmt.free();

        db.run('DELETE FROM applications WHERE id = ?', [parseInt(id)]);
        saveDB();
        res.json({ message: 'Application deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

// DELETE all applications
app.delete('/api/applications', (req, res) => {
    try {
        db.run('DELETE FROM applications');
        saveDB();
        res.json({ message: 'All applications deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete applications' });
    }
});

// ── Start Server ──
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`RE-EVOLVE API Server running on port ${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
