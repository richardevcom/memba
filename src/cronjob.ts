import https from 'https'; // For making HTTPS requests
// import pool from './db';
import config from './config';

async function checkAndSendReminders() {
  //   try {
  //     const connection = await pool.getConnection();
  //     const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format current datetime
  //     const [rows] = await connection.query(
  //       'SELECT * FROM reminders WHERE reminder_datetime = ?',
  //       [now],
  //     );
  //     connection.release();
  //     for (const reminder of rows) {
  //       const reminderData = JSON.stringify(reminder);
  //       await sendPostRequest(config.twilio.endpoint, reminderData);
  //     }
  //   } catch (err) {
  //     console.error('Error checking reminders:', err);
  //   }
}

async function sendPostRequest(url: string, data: string) {
  const options = {
    path: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length, // Set content length for the request
    },
  };

  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });

  req.on('error', (error) => {
    console.error('Error sending reminder:', error);
  });

  req.write(data);
  req.end();
}

// Run the check every second using setInterval
setInterval(checkAndSendReminders, 1000);

console.log('Reminder checker started, running every second...');
