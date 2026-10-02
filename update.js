import fs from 'fs';
import readline from 'readline';
import unzipper from 'unzipper';

const args = process.argv.slice(2)[0];
const lineRegex = /(\d{2}\/\d{2}\/\d{4}), 13:37 - (.*): (.*)/;
const iosLineRegex = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2}), 1:37:\d{2} PM] (.*?): (.*)/;

if (args.endsWith('.zip')) {
  await processStream(fs.createReadStream(args).pipe(unzipper.ParseOne(/\.txt$/)));
} else if (args.endsWith('.txt')) {
  await processStream(fs.createReadStream(args));
}

async function processStream(stream) {
  const rl = readline.createInterface({ input: stream });
  const lines = [];
  let total = 0;

  for await (const line of rl) {
    const parsed = processData(line);
    total++;
    if (parsed) {
      lines.push(parsed);
    }
  }

  const output = './src/data.json';
  const dates = new Set(lines.map(([date]) => date));
  const existing = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : [];
  const merged = [...existing.filter(([date]) => !dates.has(date)), ...lines];
  fs.rmSync(output, { force: true, });
  fs.writeFile(output, JSON.stringify(merged), { flag: 'wx' } , err => {
    if (err) {
      console.log(err)
    }
  });

  console.log(`Imported ${lines.length}/${total} lines, ${merged.length} total`);
}

function processData(line) {
  const ios = iosLineRegex.exec(line);
  if (ios) {
    const [, month, day, year, name] = ios;
    return [`${day.padStart(2, '0')}/${month.padStart(2, '0')}/20${year}`, name === 'You' ? 'Felix' : name.split(' ')[0]];
  }
  if (!lineRegex.test(line)) {
    return;
  }
  const parsed = lineRegex.exec(line);
  return [parsed[1], parsed[2].startsWith('+') ? `Davon` : parsed[2].substring(0, parsed[2].indexOf(' '))];
}
