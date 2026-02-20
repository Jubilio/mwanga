const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'mwanga-premium-secret-88';

const app = express();
const PORT = process.env.PORT || 3001;

// Database Setup
const db = new Database(path.join(__dirname, 'mwanga_v1.db'));

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    category TEXT,
    note TEXT,
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    limit_amount REAL NOT NULL,
    household_id INTEGER,
    UNIQUE(category, household_id),
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    saved_amount REAL DEFAULT 0,
    deadline TEXT,
    category TEXT,
    monthly_saving REAL DEFAULT 0,
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    landlord TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS liabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    interest_rate REAL DEFAULT 0,
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS xitiques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    monthly_amount REAL NOT NULL,
    total_participants INTEGER NOT NULL,
    frequency TEXT DEFAULT 'mensal',
    start_date TEXT NOT NULL,
    your_position INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(household_id) REFERENCES households(id)
  );
  
  -- xitique_cycles/contributions/receipts are linked to xitique_id

  CREATE TABLE IF NOT EXISTS xitique_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    xitique_id INTEGER NOT NULL,
    cycle_number INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    receiver_position INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(xitique_id) REFERENCES xitiques(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS xitique_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    xitique_id INTEGER NOT NULL,
    cycle_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    paid INTEGER DEFAULT 0,
    payment_date TEXT,
    FOREIGN KEY(xitique_id) REFERENCES xitiques(id) ON DELETE CASCADE,
    FOREIGN KEY(cycle_id) REFERENCES xitique_cycles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS xitique_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    xitique_id INTEGER NOT NULL,
    cycle_id INTEGER NOT NULL,
    total_received REAL NOT NULL,
    received_date TEXT,
    FOREIGN KEY(xitique_id) REFERENCES xitiques(id) ON DELETE CASCADE,
    FOREIGN KEY(cycle_id) REFERENCES xitique_cycles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT NOT NULL,
    value TEXT,
    household_id INTEGER,
    PRIMARY KEY(key, household_id),
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(household_id) REFERENCES households(id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Mwanga Backend API is running. Access endpoints via /api');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
});

// --- HELPER: AUDIT LOG ---
function logAction(userId, action, targetType, targetId) {
  try {
    db.prepare('INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (?, ?, ?, ?)')
      .run(userId, action, targetType, targetId);
  } catch (e) {
    console.error('Audit Log failed:', e);
  }
}

// --- MIDDLEWARE: AUTH ---
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- AUTH ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, householdName } = req.body;
  
  try {
    const transaction = db.transaction(() => {
      // Create household if needed
      const hInfo = db.prepare('INSERT INTO households (name) VALUES (?)').run(householdName || `${name}'s Home`);
      const householdId = hInfo.lastInsertRowid;

      // Hash password
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);

      const uInfo = db.prepare('INSERT INTO users (name, email, password_hash, household_id) VALUES (?, ?, ?, ?)')
                    .run(name, email, hash, householdId);
      
      const userId = uInfo.lastInsertRowid;
      logAction(userId, 'REGISTER', 'USER', userId);
      
      return { id: userId, name, email, householdId };
    });

    const user = transaction();
    const token = jwt.sign({ id: user.id, householdId: user.householdId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });

  } catch (e) {
    res.status(400).json({ error: 'Email already exists or error creating account' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, householdId: user.household_id }, JWT_SECRET, { expiresIn: '7d' });
  const userData = { id: user.id, name: user.name, email: user.email, householdId: user.household_id };
  
  logAction(user.id, 'LOGIN', 'USER', user.id);
  res.json({ user: userData, token });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, household_id FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.put('/api/auth/profile', authenticate, (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  logAction(req.user.id, 'UPDATE_PROFILE', 'USER', req.user.id);
  res.json({ success: true, name });
});

app.put('/api/households', authenticate, (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE households SET name = ? WHERE id = ?').run(name, req.user.householdId);
  logAction(req.user.id, 'UPDATE_HOUSEHOLD', 'HOUSEHOLD', req.user.householdId);
  res.json({ success: true, name });
});

// --- TRANSACTIONS ---
app.get('/api/transactions', authenticate, (req, res) => {
  const ts = db.prepare('SELECT * FROM transactions WHERE household_id = ? ORDER BY date DESC').all(req.user.householdId);
  res.json(ts);
});

app.post('/api/transactions', authenticate, (req, res) => {
  const { date, type, description, amount, category, note } = req.body;
  const info = db.prepare('INSERT INTO transactions (date, type, description, amount, category, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(date, type, description, amount, category, note, req.user.householdId);
  res.json({ id: info.lastInsertRowid, ...req.body });
});

app.delete('/api/transactions/:id', authenticate, (req, res) => {
  // Check ownership
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND household_id = ?').get(req.params.id, req.user.householdId);
  if (!tx) return res.status(403).json({ error: 'Access denied' });
  
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- BUDGETS ---
app.get('/api/budgets', authenticate, (req, res) => {
  const data = db.prepare('SELECT * FROM budgets WHERE household_id = ?').all(req.user.householdId);
  res.json(data);
});

app.post('/api/budgets', authenticate, (req, res) => {
  const { category, limit } = req.body;
  db.prepare('INSERT INTO budgets (category, limit_amount, household_id) VALUES (?, ?, ?) ON CONFLICT(category, household_id) DO UPDATE SET limit_amount = ?')
    .run(category, limit, req.user.householdId, limit);
  res.json({ category, limit });
});

// --- GOALS ---
app.get('/api/goals', authenticate, (req, res) => {
  const data = db.prepare('SELECT * FROM goals WHERE household_id = ?').all(req.user.householdId);
  res.json(data);
});

app.post('/api/goals', authenticate, (req, res) => {
  const { name, targetAmount, savedAmount, deadline, category, monthlySaving } = req.body;
  const info = db.prepare('INSERT INTO goals (name, target_amount, saved_amount, deadline, category, monthly_saving, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(name, targetAmount, savedAmount || 0, deadline, category, monthlySaving || 0, req.user.householdId);
  res.json({ id: info.lastInsertRowid, ...req.body });
});

app.put('/api/goals/:id', authenticate, (req, res) => {
  const { savedAmount } = req.body;
  db.prepare('UPDATE goals SET saved_amount = ? WHERE id = ? AND household_id = ?').run(savedAmount, req.params.id, req.user.householdId);
  res.json({ success: true });
});

app.delete('/api/goals/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
});

// --- RENTALS ---
app.get('/api/rentals', authenticate, (req, res) => {
  const data = db.prepare('SELECT * FROM rentals WHERE household_id = ? ORDER BY month DESC').all(req.user.householdId);
  res.json(data);
});

app.post('/api/rentals', authenticate, (req, res) => {
  const { month, landlord, amount, status, notes } = req.body;
  
  const transaction = db.transaction(() => {
    const info = db.prepare('INSERT INTO rentals (month, landlord, amount, status, notes, household_id) VALUES (?, ?, ?, ?, ?, ?)')
                  .run(month, landlord, amount, status, notes, req.user.householdId);
    
    if (status === 'pago') {
      db.prepare(`
        INSERT INTO transactions (date, type, description, amount, category, note, household_id)
        VALUES (?, 'despesa', ?, ?, 'Renda', ?, ?)
      `).run(
        new Date().toISOString().slice(0, 10),
        `Renda: ${month} - ${landlord}`,
        amount,
        notes || 'Pagamento registado via módulo Habitação',
        req.user.householdId
      );
    }
    return info.lastInsertRowid;
  });

  const id = transaction();
  res.json({ id, ...req.body });
});

app.delete('/api/rentals/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM rentals WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
});

// --- ASSETS ---
app.get('/api/assets', authenticate, (req, res) => {
  const data = db.prepare('SELECT * FROM assets WHERE household_id = ?').all(req.user.householdId);
  res.json(data);
});

app.post('/api/assets', authenticate, (req, res) => {
  const { name, type, value } = req.body;
  const info = db.prepare('INSERT INTO assets (name, type, value, household_id) VALUES (?, ?, ?, ?)')
                .run(name, type, value, req.user.householdId);
  res.json({ id: info.lastInsertRowid, ...req.body });
});

app.delete('/api/assets/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
});

// --- LIABILITIES ---
app.get('/api/liabilities', authenticate, (req, res) => {
  const data = db.prepare('SELECT * FROM liabilities WHERE household_id = ?').all(req.user.householdId);
  res.json(data);
});

app.post('/api/liabilities', authenticate, (req, res) => {
  const { name, totalAmount, remainingAmount, interestRate } = req.body;
  const info = db.prepare('INSERT INTO liabilities (name, total_amount, remaining_amount, interest_rate, household_id) VALUES (?, ?, ?, ?, ?)')
                .run(name, totalAmount, remainingAmount, interestRate || 0, req.user.householdId);
  res.json({ id: info.lastInsertRowid, ...req.body });
});

app.delete('/api/liabilities/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM liabilities WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
});

// --- XITIQUES ---
app.get('/api/xitiques', authenticate, (req, res) => {
  const list = db.prepare('SELECT * FROM xitiques WHERE household_id = ? ORDER BY created_at DESC').all(req.user.householdId);
  const fullList = list.map(x => {
    const cycles = db.prepare('SELECT * FROM xitique_cycles WHERE xitique_id = ?').all(x.id);
    const contributions = db.prepare('SELECT * FROM xitique_contributions WHERE xitique_id = ?').all(x.id);
    const receipts = db.prepare('SELECT * FROM xitique_receipts WHERE xitique_id = ?').all(x.id);
    return { ...x, cycles, contributions, receipts };
  });
  res.json(fullList);
});

app.post('/api/xitiques', authenticate, (req, res) => {
  const { name, monthlyAmount, totalParticipants, startDate, yourPosition } = req.body;
  
  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO xitiques (name, monthly_amount, total_participants, start_date, your_position, household_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, monthlyAmount, totalParticipants, startDate, yourPosition, req.user.householdId);
    
    const xitiqueId = info.lastInsertRowid;
    
    // Generate Cycles
    for (let i = 1; i <= totalParticipants; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + (i - 1));
      const dueDate = date.toISOString().slice(0, 7);
      
      const cycleInfo = db.prepare(`
        INSERT INTO xitique_cycles (xitique_id, cycle_number, due_date, receiver_position)
        VALUES (?, ?, ?, ?)
      `).run(xitiqueId, i, dueDate, i);
      
      const cycleId = cycleInfo.lastInsertRowid;
      
      db.prepare(`
        INSERT INTO xitique_contributions (xitique_id, cycle_id, amount, paid)
        VALUES (?, ?, ?, 0)
      `).run(xitiqueId, cycleId, monthlyAmount);

      if (i === yourPosition) {
        db.prepare(`
          INSERT INTO xitique_receipts (xitique_id, cycle_id, total_received)
          VALUES (?, ?, ?)
        `).run(xitiqueId, cycleId, monthlyAmount * totalParticipants);
      }
    }
    return xitiqueId;
  });

  const id = transaction();
  res.json({ id, ...req.body });
});

app.post('/api/xitiques/pay/:contributionId', authenticate, (req, res) => {
  const { date } = req.body;
  // Verify ownership via xitique link
  const contribution = db.prepare(`
    SELECT c.*, x.household_id 
    FROM xitique_contributions c 
    JOIN xitiques x ON c.xitique_id = x.id 
    WHERE c.id = ? AND x.household_id = ?
  `).get(req.params.contributionId, req.user.householdId);

  if (!contribution) return res.status(403).json({ error: 'Access denied' });

  const xitique = db.prepare('SELECT name FROM xitiques WHERE id = ?').get(contribution.xitique_id);

  const transaction = db.transaction(() => {
    db.prepare('UPDATE xitique_contributions SET paid = 1, payment_date = ? WHERE id = ?')
      .run(date, req.params.contributionId);
    
    db.prepare(`
      INSERT INTO transactions (date, type, description, amount, category, note, household_id)
      VALUES (?, 'despesa', ?, ?, 'Xitique', ?, ?)
    `).run(date, `Contribuição Xitique: ${xitique.name}`, contribution.amount, 'Pagamento automático via módulo Xitique', req.user.householdId);
  });

  transaction();
  res.json({ success: true });
});

app.post('/api/xitiques/receive/:receiptId', authenticate, (req, res) => {
  const { date } = req.body;
  const receipt = db.prepare(`
    SELECT r.*, x.household_id 
    FROM xitique_receipts r 
    JOIN xitiques x ON r.xitique_id = x.id 
    WHERE r.id = ? AND x.household_id = ?
  `).get(req.params.receiptId, req.user.householdId);

  if (!receipt) return res.status(403).json({ error: 'Access denied' });

  const xitique = db.prepare('SELECT name FROM xitiques WHERE id = ?').get(receipt.xitique_id);

  const transaction = db.transaction(() => {
    db.prepare('UPDATE xitique_receipts SET received_date = ? WHERE id = ?')
      .run(date, req.params.receiptId);
    
    db.prepare(`
      INSERT INTO transactions (date, type, description, amount, category, note, household_id)
      VALUES (?, 'receita', ?, ?, 'Xitique', ?, ?)
    `).run(date, `Recebimento Xitique: ${xitique.name}`, receipt.total_received, 'Recebimento automático via módulo Xitique', req.user.householdId);
  });

  transaction();
  res.json({ success: true });
});

app.delete('/api/xitiques/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM xitiques WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
});

// --- SETTINGS ---
app.get('/api/settings', authenticate, (req, res) => {
  const data = db.prepare('SELECT * FROM settings WHERE household_id = ?').all(req.user.householdId);
  const settings = data.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settings);
});

app.post('/api/settings', authenticate, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });
    
    const safeValue = value === null || value === undefined ? '' : value.toString();
    const householdId = req.user?.householdId;

    if (!householdId) return res.status(401).json({ error: 'Household ID not found' });

    db.prepare('INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT(key, household_id) DO UPDATE SET value = ?')
      .run(key, safeValue, householdId, safeValue);
    
    res.json({ success: true, key, value: safeValue });
  } catch (error) {
    console.error('Settings Error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
