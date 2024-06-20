import mysql from 'mysql2/promise';
import config from './config';

const pool = mysql.createPool({
  host: config.mysql.host, // Replace with your remote MySQL host
  user: config.mysql.user, // Replace with your remote MySQL username
  password: config.mysql.pass, // Replace with your remote MySQL password
  database: config.mysql.db,
});

async () => {
  const connection = await pool.getConnection();

  try {
    await connection.query(`
            CREATE TABLE reminders (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            reminder_recipient VARCHAR(20) NOT NULL,
            reminder_text VARCHAR(255) NOT NULL,
            reminder_datetime DATETIME NOT NULL
            );
        `);
  } catch (err) {
    console.error('Error importing schema:', err);
  } finally {
    connection.release();
  }
};

export default pool;
