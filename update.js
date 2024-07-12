// const args = process.argv.slice(2);
const fs = require('node:fs');
fs.readFile('C:\\import\\chat.txt', 'utf8', (err, data) => {
    const re = /(\d{2}\/\d{2}\/\d{4}), 13:37 - (.*): (.*)/;
    const lines = data.split('\n')
        .map(line => re.exec(line))
        .filter(line => !!line)
        .map(line => re.exec(line))
        .map(line => [line[1], line[2].startsWith('+') ? `Davon` : line[2].substring(0, line[2].indexOf(' '))]);

    const output = './src/data.json';
    fs.rmSync(output, { force: true, });
    fs.writeFile(output, JSON.stringify(lines), { flag: 'wx' } , err => {
        if (err) {
            console.log(err)
        }
    });

    console.log(`Imported ${lines.length} lines`);
});
