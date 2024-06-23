import { db } from './db';
import { addMilliseconds, differenceInMilliseconds } from 'date-fns';
import twilio from 'twilio';
import env from './env';

/** The difference in milliseconds between each schedule */
const SCHEDULE_DIFFERENCE_MS = 1 * 60 * 1000; // 1 minute

type Reminder = {
  user: {
    phone: string;
  };
  id: string;
  text: string;
  time: Date;
};

export class ReminderScheduler {
  client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  /** start the reminder scheduler */
  public start() {
    console.log(
      `[rembo] starting reminder scheduler with ${SCHEDULE_DIFFERENCE_MS}ms difference`,
    );
    (async () => {
      await this.findAndScheduleReminders();
    })();
    setInterval(this.findAndScheduleReminders, SCHEDULE_DIFFERENCE_MS);
  }

  /** find and schedule reminders */
  async findAndScheduleReminders() {
    console.log('[rembo] firing reminder scheduler');
    const now = new Date();
    console.log(
      `[rembo] checking messages between "${now.toISOString()}" and "${addMilliseconds(now, SCHEDULE_DIFFERENCE_MS).toISOString()}"`,
    );
    const reminders: Reminder[] = await db.reminder.findMany({
      where: {
        AND: [
          {
            time: {
              gte: now, // now
            },
          },
          {
            time: {
              lte: addMilliseconds(now, SCHEDULE_DIFFERENCE_MS), // now + 1 hour
            },
          },
        ],
      },
      select: {
        id: true,
        time: true,
        text: true,
        user: {
          select: {
            phone: true,
          },
        },
      },
    });
    reminders.forEach((reminder) => {
      this.scheduleReminder(reminder, now);
    });
    console.log(`[rembo] scheduled ${reminders.length} reminders`);
  }

  /** schedule a reminder to be sent */
  scheduleReminder(reminder: Reminder, now: Date) {
    setTimeout(
      async () => {
        await this.sendReminder(reminder.text, reminder.user.phone);
      },
      differenceInMilliseconds(reminder.time, now),
    );
  }

  /** send a reminder to a user */
  async sendReminder(reminderText: string, userPhone: string) {
    await this.client.messages.create({
      body: reminderText,
      from: env.TWILIO_PHONE_NUMBER,
      to: userPhone,
    });
  }
}
