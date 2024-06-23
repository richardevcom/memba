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
  console.log('[rembo] firing reminder scheduler');
  const now = new Date();
  const nowPlusDifference = addMilliseconds(now, SCHEDULE_DIFFERENCE_MS);
  const nowPlusTwiceDifference = addMilliseconds(
    now,
    2 * SCHEDULE_DIFFERENCE_MS,
  );
  console.log(
    `[rembo] @"${now.toUTCString()}" checking messages between "${nowPlusDifference.toUTCString()}" and "${nowPlusTwiceDifference.toUTCString()}"`,
  );
  const reminders: Reminder[] = await db.reminder.findMany({
    where: {
      AND: [
        {
          time: {
            gte: nowPlusDifference, // now + 1 minute
          },
        },
        {
          time: {
            lte: nowPlusTwiceDifference, // now + 2 minute
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

/** Schedules a reminder to be sent */
function scheduleReminder(reminder: Reminder, now: Date) {
  const firingTime = differenceInMilliseconds(reminder.time, now);
  console.log(
    `[rembo] scheduling reminder ${reminder.text} in ${firingTime / 1000}s`,
  );
  setTimeout(
    async () => {
      const res = await client.messages.create({
        body: reminder.text,
        from: env.TWILIO_PHONE_NUMBER,
        to: reminder.user.phone,
      });
      console.log(`Output: ${JSON.stringify(res.body, null, 2)}`);
      console.log(
        `[rembo] tried to reminder ${reminder.id} to ${reminder.user.phone}`,
      );
    },
    differenceInMilliseconds(reminder.time, now),
  );
}
