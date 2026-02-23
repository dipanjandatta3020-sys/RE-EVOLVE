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

// Static site directory (built by Vite)
const STATIC_DIR = join(__dirname, '..', 'site', 'dist');

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Database Setup ──
let db;

async function initDB() {
    const SQL = await initSqlJs();
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

    if (existsSync(DB_PATH)) {
        db = new SQL.Database(readFileSync(DB_PATH));
    } else {
        db = new SQL.Database();
    }

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
    writeFileSync(DB_PATH, Buffer.from(data));
}

// ── API Routes (before static files) ──

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/applications', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM applications ORDER BY id DESC');
        const apps = [];
        while (stmt.step()) apps.push(stmt.getAsObject());
        stmt.free();
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

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

        const idStmt = db.prepare('SELECT last_insert_rowid() as id');
        idStmt.step();
        const id = idStmt.getAsObject().id;
        idStmt.free();

        res.status(201).json({ id, message: 'Application submitted successfully', timestamp });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save application' });
    }
});

app.delete('/api/applications/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const checkStmt = db.prepare('SELECT id FROM applications WHERE id = ?');
        checkStmt.bind([id]);
        if (!checkStmt.step()) { checkStmt.free(); return res.status(404).json({ error: 'Not found' }); }
        checkStmt.free();
        db.run('DELETE FROM applications WHERE id = ?', [id]);
        saveDB();
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.delete('/api/applications', (req, res) => {
    try {
        db.run('DELETE FROM applications');
        saveDB();
        res.json({ message: 'All deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear' });
    }
});

// ── Serve Static Site ──
app.use(express.static(STATIC_DIR));

// SPA fallback — serve index.html for /apply/ and /admin/ routes
app.get('/apply/*', (req, res) => {
    const applyIndex = join(STATIC_DIR, 'apply', 'index.html');
    if (existsSync(applyIndex)) return res.sendFile(applyIndex);
    res.sendFile(join(STATIC_DIR, 'index.html'));
});

app.get('/admin/*', (req, res) => {
    const adminIndex = join(STATIC_DIR, 'admin', 'index.html');
    if (existsSync(adminIndex)) return res.sendFile(adminIndex);
    res.sendFile(join(STATIC_DIR, 'index.html'));
});

// Catch-all for the main site
app.get('*', (req, res) => {
    res.sendFile(join(STATIC_DIR, 'index.html'));
});

// ── Start ──
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`RE-EVOLVE running on port ${PORT}`);
    });
}).catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
});
