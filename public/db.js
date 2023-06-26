const sqlite = require('sqlite3').verbose();

const db = new sqlite.Database('../models/db.db');

module.exports.database = db;