const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class AlertsDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, 'alerts.db');
    this.db = null;
    this.init();
  }

  init() {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening alerts database:', err);
      } else {
        console.log('Connected to alerts SQLite database');
        this.createTables();
      }
    });
  }

  createTables() {
    const createAlertsTable = `
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        headline TEXT,
        productType TEXT,
        affectedArea TEXT,
        expires TEXT,
        states TEXT,
        geometry TEXT,
        parameters TEXT,
        rawData TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(createAlertsTable, (err) => {
      if (err) {
        console.error('Error creating alerts table:', err);
      } else {
        console.log('Alerts table ready');
      }
    });
  }

  // Store or update an alert
  storeAlert(alert) {
    return new Promise((resolve, reject) => {
      const {
        id,
        headline,
        productType,
        affectedArea,
        expires,
        states,
        geometry,
        parameters
      } = alert;

      const sql = `
        INSERT OR REPLACE INTO alerts 
        (id, headline, productType, affectedArea, expires, states, geometry, parameters, rawData, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const values = [
        id,
        headline,
        productType,
        affectedArea,
        expires,
        JSON.stringify(states || []),
        JSON.stringify(geometry || null),
        JSON.stringify(parameters || {}),
        JSON.stringify(alert)
      ];

      this.db.run(sql, values, function(err) {
        if (err) {
          console.error('Error storing alert:', err);
          reject(err);
        } else {
          console.log(`Alert stored/updated: ${id}`);
          resolve(this.lastID);
        }
      });
    });
  }

  // Get all active alerts (not expired)
  getActiveAlerts() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM alerts 
        WHERE expires = 'N/A' OR expires = '' OR expires IS NULL OR datetime(expires) > datetime('now')
        ORDER BY createdAt DESC
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching active alerts:', err);
          reject(err);
        } else {
          // Parse JSON fields back to objects
          const alerts = rows.map(row => ({
            id: row.id,
            headline: row.headline,
            productType: row.productType,
            affectedArea: row.affectedArea,
            expires: row.expires,
            states: JSON.parse(row.states || '[]'),
            geometry: JSON.parse(row.geometry || 'null'),
            parameters: JSON.parse(row.parameters || '{}'),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          }));
          resolve(alerts);
        }
      });
    });
  }

  // Get all alerts (including expired)
  getAllAlerts(limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM alerts 
        ORDER BY createdAt DESC 
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          console.error('Error fetching all alerts:', err);
          reject(err);
        } else {
          // Parse JSON fields back to objects
          const alerts = rows.map(row => ({
            id: row.id,
            headline: row.headline,
            productType: row.productType,
            affectedArea: row.affectedArea,
            expires: row.expires,
            states: JSON.parse(row.states || '[]'),
            geometry: JSON.parse(row.geometry || 'null'),
            parameters: JSON.parse(row.parameters || '{}'),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          }));
          resolve(alerts);
        }
      });
    });
  }

  // Clean up expired alerts (removes alerts immediately when they expire)
  cleanupExpiredAlerts() {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM alerts 
        WHERE expires != 'N/A' AND expires != '' AND expires IS NOT NULL 
        AND datetime(expires) < datetime('now')
      `;

      this.db.run(sql, function(err) {
        if (err) {
          console.error('Error cleaning up expired alerts:', err);
          reject(err);
        } else {
          console.log(`Cleaned up ${this.changes} expired alerts`);
          resolve(this.changes);
        }
      });
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing alerts database:', err);
        } else {
          console.log('Alerts database connection closed');
        }
      });
    }
  }
}

module.exports = AlertsDatabase;
