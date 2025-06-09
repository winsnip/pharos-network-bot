import kleur from "kleur";
import readline from "readline";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function delayWithProgress(
  ms: number,
  message: string
): Promise<void> {
  const seconds = Math.floor(ms / 1000);
  console.log(kleur.yellow(`⏳ ${message}`));

  for (let i = seconds; i > 0; i--) {
    const progress = "█".repeat(Math.floor(((seconds - i + 1) * 20) / seconds));
    const remaining = "░".repeat(20 - progress.length);

    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 1);
    process.stdout.write(`   [${progress}${remaining}] ${i}s remaining`);

    await delay(1000);
  }

  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 1);
  console.log(kleur.green(`   ✓ ${message.replace("Waiting", "Completed")}`));
}

export function countdown(ms: number): void {
  const end = Date.now() + ms;
  const interval = setInterval(() => {
    const now = Date.now();
    const remaining = end - now;

    if (remaining <= 0) {
      clearInterval(interval);
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 1);
      console.log(kleur.green("🚀 Starting scheduled transactions..."));
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 1);
    process.stdout.write(
      kleur.blue(
        `⏰ Next run in: ${kleur
          .yellow()
          .bold(
            `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          )}`
      )
    );
  }, 1000);
}

export function validateMode(mode: string): "auto" | "manual" {
  if (mode !== "auto" && mode !== "manual") {
    throw new Error('Mode must be "auto" or "manual"');
  }
  return mode as "auto" | "manual";
}

export function calculateDelayUntilNextRun(
  hour: number,
  minute: number
): number {
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(hour, minute, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.getTime() - now.getTime();
}

export function validatePositiveNumber(
  input: string,
  fieldName: string
): number {
  const value = parseFloat(input);
  if (isNaN(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return value;
}

export function validateHour(input: string): number {
  const hour = parseInt(input);
  if (isNaN(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be between 0-23");
  }
  return hour;
}

export function validateMinute(input: string): number {
  const minute = parseInt(input);
  if (isNaN(minute) || minute < 0 || minute > 59) {
    throw new Error("Minute must be between 0-59");
  }
  return minute;
}
