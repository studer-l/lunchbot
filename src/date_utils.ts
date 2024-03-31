import { Day, nextDay } from 'date-fns';

function getNextDayMod(date: Date = new Date(), day: Day) {
  const theDay =
    date.getDay() == day ? new Date(date.getTime()) : nextDay(date, day);
  theDay.setHours(0);
  theDay.setMinutes(0);
  theDay.setSeconds(0);
  theDay.setMilliseconds(0);
  return theDay;
}

export function getNextLunchDate(date: Date = new Date()): Date {
  return getNextDayMod(date, 3);
}

export function getNextDayAfterLunchDate(date: Date = new Date()): Date {
  return getNextDayMod(date, 4);
}
