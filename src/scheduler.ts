import { db } from './db';
import { addMilliseconds, differenceInMilliseconds } from 'date-fns';
import twilio from 'twilio';
import env from './env';

/** The difference in milliseconds between each schedule */
const SCHEDULE_DIFFERENCE_MS = 1 * 60 * 1000; // 1 minute
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

type Reminder = {
  user: {
    phone: string;
  };
  id: string;
  text: string;
  time: Date;
};

export class ReminderScheduler {
  constructor() {}

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
    const nowPlusDiff = addMilliseconds(now, SCHEDULE_DIFFERENCE_MS);
    console.log(
      `[rembo] checking messages between "${now.toUTCString()}" and "${nowPlusDiff.toUTCString()}"`,
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
              lte: nowPlusDiff, // now + 1 minute
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
    console.log(`[rembo] found  ${reminders.length} reminders`);
    reminders.forEach((reminder) => {
      scheduleReminder(reminder, now);
    });
  }
}

function scheduleReminder(reminder: Reminder, now: Date) {
  setTimeout(
    async () => {
      await client.messages.create({
        body: reminder.text,
        from: env.TWILIO_PHONE_NUMBER,
        to: reminder.user.phone,
      });
    },
    differenceInMilliseconds(reminder.time, now),
  );
}
