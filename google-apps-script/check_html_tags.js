const fs = require('fs');
const content = fs.readFileSync('c:/Users/DELL/Desktop/JK-ClickCraft/gallery.html', 'utf8');

// A very simple tag parser to check nested tags
let pos = 0;
const stack = [];
const tags = [];

while (pos < content.length) {
  const nextTag = content.indexOf('<', pos);
  if (nextTag === -1) break;
  
  if (content.startsWith('<!--', nextTag)) {
    const endComment = content.indexOf('-->', nextTag + 4);
    if (endComment === -1) break;
    pos = endComment + 3;
    continue;
  }
  
  if (content.startsWith('<!', nextTag)) {
    const endTag = content.indexOf('>', nextTag + 2);
    if (endTag === -1) break;
    pos = endTag + 1;
    continue;
  }
  
  const endTag = content.indexOf('>', nextTag);
  if (endTag === -1) break;
  
  const tagContent = content.substring(nextTag + 1, endTag).trim();
  pos = endTag + 1;
  
  if (tagContent.startsWith('/')) {
    const tagName = tagContent.substring(1).split(/\s+/)[0].toLowerCase();
    const last = stack.pop();
    if (!last || last.name !== tagName) {
      console.log(`Mismatch: closed </${tagName}> but expected </${last ? last.name : 'none'}> around line ${content.substring(0, nextTag).split('\n').length}`);
    }
  } else if (!tagContent.endsWith('/')) {
    const tagName = tagContent.split(/\s+/)[0].toLowerCase();
    // Ignore void tags
    const voidTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'col', 'base', 'area', 'param'];
    if (!voidTags.includes(tagName)) {
      stack.push({ name: tagName, line: content.substring(0, nextTag).split('\n').length });
    }
  }
}

console.log('Stack at end of file:', stack);
