const fs = require('fs');
const content = fs.readFileSync('c:/Users/DELL/Desktop/JK-ClickCraft/gallery.html', 'utf8');
const regex = /<\/script/gi;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`Found match at index ${match.index}: ${match[0]} around line ${content.substring(0, match.index).split('\n').length}`);
}
