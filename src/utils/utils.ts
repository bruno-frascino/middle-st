// 2021-04-01 11:58:21
export function convertStringToUnixTime(dateString: string) {
  const two = dateString.split(' ');
  const date = two[0].split('-');
  const time = two[1].split(':');
  // year, month, day, hour, minute, second
  const dateTimeObject = new Date(
    parseInt(date[0], 10),
    parseInt(date[1], 10),
    parseInt(date[2], 10),
    parseInt(time[0], 10),
    parseInt(time[1], 10),
    parseInt(time[2], 10),
  );
  return Math.floor(dateTimeObject.getTime() / 1000);
}

// Unix time
export function addToCurrentTime(seconds: number) {
  const now = Math.floor(Date.now() / 1000); // Unix time is Seconds since 01-01-70
  return now + seconds;
}
