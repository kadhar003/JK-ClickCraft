const fs = require('fs');
const content = fs.readFileSync('c:/Users/DELL/Desktop/JK-ClickCraft/gallery.html', 'utf8');
const lines = content.split('\n');
for (let i = 3018; i < 3028; i++) {
  const line = lines[i];
  console.log(`Line ${i + 1}: ${line}`);
  for (let j = 0; j < line.length; j++) {
    const charCode = line.charCodeAt(j);
    if (charCode > 127) {
      console.log(`  Char at ${j}: code=${charCode} char=${line[j]}`);
    }
  }
}
