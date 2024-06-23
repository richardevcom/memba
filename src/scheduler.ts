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
    this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  /** start the reminder scheduler */
  public start() {
    console.log(
      `[rembo] starting reminder scheduler with ${SCHEDULE_DIFFERENCE_MS}ms difference`,
    );
    (async () => {
      await this.findAndScheduleReminders();
    })();
    setInterval(
      this.findAndScheduleReminders.bind(this),
      SCHEDULE_DIFFERENCE_MS,
    );
  }

  /** find and schedule reminders */
  async findAndScheduleReminders() {
    console.log('[rembo] firing reminder scheduler');
    const now = new Date();
    const nowPlusDiff = addMilliseconds(now, SCHEDULE_DIFFERENCE_MS);
    const nowPlusDiff2 = addMilliseconds(now, 2 * SCHEDULE_DIFFERENCE_MS);
    console.log(
      `[rembo] @"${now.toUTCString()}" checking messages between "${nowPlusDiff.toUTCString()}" and "${nowPlusDiff2.toUTCString()}"`,
    );
    const reminders: Reminder[] = await db.reminder.findMany({
      where: {
        AND: [
          {
            time: {
              gte: nowPlusDiff, // now + 1 minute
            },
          },
          {
            time: {
              lte: nowPlusDiff2, // now + 2 minute
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
      this.scheduleReminder(reminder, now);
    });
  }

  /** schedule a fire a reminder */
  scheduleReminder(reminder: Reminder, now: Date) {
    setTimeout(
      async () => {
        const res = await this.client.messages.create({
          body: reminder.text,
          from: env.TWILIO_PHONE_NUMBER,
          to: reminder.user.phone,
        });
        console.log(JSON.stringify(res, null, 2));
        console.log(
          `[rembo] sent reminder ${reminder.id} to ${reminder.user.phone}`,
        );
      },
      differenceInMilliseconds(reminder.time, now),
    );
  }
}
