import fs from 'fs';
import readline from 'readline';
import unzipper from 'unzipper';

const args = process.argv.slice(2)[0];
const lineRegex = /(\d{2}\/\d{2}\/\d{4}), 13:37 - (.*): (.*)/;

if (args.endsWith('.zip')) {
  await processStream(fs.createReadStream(args).pipe(unzipper.ParseOne()));
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
  fs.rmSync(output, { force: true, });
  fs.writeFile(output, JSON.stringify(lines), { flag: 'wx' } , err => {
    if (err) {
      console.log(err)
    }
  });

  console.log(`Imported ${lines.length}/${total} lines`);
}

function processData(line) {
  if (!lineRegex.test(line)) {
    return;
  }
  const parsed = lineRegex.exec(line);
  return [parsed[1], parsed[2].startsWith('+') ? `Davon` : parsed[2].substring(0, parsed[2].indexOf(' '))];
}
