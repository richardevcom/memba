import { db } from './db';
import { addMilliseconds, differenceInMilliseconds } from 'date-fns';
import twilio from 'twilio';
import env from './env';

type Reminder = {
  user: {
    phone: string;
  };
  id: string;
  text: string;
  time: Date;
  sent: boolean;
};

/** The difference in milliseconds between each schedule */
const SCHEDULE_DIFFERENCE_MS = 1 * 60 * 1000; // 1 minute
const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/** Starts the reminder scheduler */
export function startScheduler() {
  console.log(
    `[rembo] starting reminder scheduler with ${SCHEDULE_DIFFERENCE_MS}ms difference`,
  );
  (async () => {
    await findAndScheduleReminders();
  })();
  setInterval(findAndScheduleReminders, SCHEDULE_DIFFERENCE_MS);
}

/** Finds and schedules reminders */
async function findAndScheduleReminders() {
  const now = new Date();

  // the window of time to check for reminders is only 1 minute long.
  const windowStart = addMilliseconds(now, SCHEDULE_DIFFERENCE_MS);
  const windowEnd = addMilliseconds(now, SCHEDULE_DIFFERENCE_MS + 60 * 1000);

  console.log(
    `[rembo] @"${now.toUTCString()}" checking messages between "${windowStart.toUTCString()}" and "${windowEnd.toUTCString()}"`,
  );
  const reminders: Reminder[] = await db.reminder.findMany({
    where: {
      sent: false,
    },
    select: {
      id: true,
      time: true,
      text: true,
      sent: true,
      user: {
        select: {
          phone: true,
        },
      },
    },
  });

  console.log(`[rembo] found  ${reminders.length} reminders`);
  reminders.forEach((reminder) => {
    if (reminder.time <= now && !reminder.sent) {
      scheduleReminder(reminder, now);
    } else {
      console.log(
        `[rembo] testing `,
        reminder.time,
        now,
        reminder.time <= now,
        reminder.sent,
      );
    }
  });
}

/** Schedules a reminder to be sent */
function scheduleReminder(reminder: Reminder, now: Date) {
  const firingTime = differenceInMilliseconds(reminder.time, now);

  console.log(
    `[rembo] scheduling reminder ${reminder.text} in ${firingTime / 1000}s`,
  );
  setTimeout(
    async () => {
      try {
        const res = await client.messages.create({
          body: `Reminder: ${reminder.text}`,
          from: env.TWILIO_PHONE_NUMBER,
          to: reminder.user.phone,
        });

        console.log(
          `[rembo] sent sms from scheduler: ${JSON.stringify(
            {
              responseBody: res.body,
              reminder: reminder,
            },
            null,
            2,
          )}`,
        );

        try {
          await db.reminder.update({
            where: {
              id: reminder.id,
            },
            data: {
              sent: true,
            },
          });
        } catch (err) {
          console.log(`[rembo] error updating 'sent' field to true: ${err}`);
        }
      } catch (e) {
        console.log(
          `[rembo] error sending sms from scheduler: ${JSON.stringify(
            {
              error: e,
              reminder: reminder,
            },
            null,
            2,
          )}`,
        );
      }
    },
    differenceInMilliseconds(reminder.time, now),
  );
}
