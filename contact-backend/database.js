// Database module - now uses Supabase
// This file maintains backward compatibility for existing imports
// Actual implementation is in src/services/database.js

const { db, initializeDatabase } = require('./src/services/database')

module.exports = { db, initializeDatabase }
