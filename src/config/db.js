import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000 
});

pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully.');
    connection.release(); // Release the connection back to the pool
  })
  .catch(error => {
    console.error('Database connection failed:', error);
  });

export default pool;
