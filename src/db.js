const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path for the SQLite database file
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '..', 'devsecops_database.sqlite');

// Create a new SQLite database connection
// The database will be created if it doesn't exist at DB_PATH
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log(`Connected to the SQLite database at ${DB_PATH}`);
    // Enable foreign key support
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error("Failed to enable PRAGMA foreign_keys:", pragmaErr.message);
      }
    });
  }
});

// Promisify db.run, db.get, db.all for async/await usage
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { // Use function() to access this.lastID
      if (err) {
        console.error('Error running sql:', sql, params, err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        console.error('Error running sql:', sql, params, err.message);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error running sql:', sql, params, err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize database by creating tables if they don't exist
async function initializeDb() {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS onboarded_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        repository_url TEXT NOT NULL,
        main_branch TEXT DEFAULT 'main',
        node_version TEXT DEFAULT '18.17.1',
        docker_file_path TEXT DEFAULT 'Dockerfile',
        build_command TEXT DEFAULT 'npm run build',
        test_command TEXT DEFAULT 'npm test',
        port_number INTEGER DEFAULT 5000,
        staging_server_address TEXT,
        sonar_project_key TEXT,
        sonar_organization TEXT,
        notification_endpoint TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await run(`
      CREATE TABLE IF NOT EXISTS project_secrets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        secret_name TEXT NOT NULL,
        secret_description TEXT,
        is_required BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES onboarded_projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, secret_name)
      );
    `);
    
    // Add a trigger to update 'updated_at' timestamp on onboarded_projects table
    await run(`
      CREATE TRIGGER IF NOT EXISTS update_onboarded_projects_updated_at
      AFTER UPDATE ON onboarded_projects
      FOR EACH ROW
      BEGIN
        UPDATE onboarded_projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);

    // Add an index for project_name for faster lookups
    await run(`
      CREATE INDEX IF NOT EXISTS idx_project_name 
      ON onboarded_projects (project_name);
    `);

    console.log('SQLite database tables and indexes have been initialized.');
  } catch (err) {
    console.error('Error initializing SQLite database tables or indexes:', err.message);
    // If initialization fails, it might be critical, so rethrow or handle appropriately
    throw err; 
  }
}

// Export the database connection and query functions
module.exports = {
  db, // The raw sqlite3.Database object, if needed
  run,
  get,
  all,
  initializeDb
};
