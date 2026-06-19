import * as fs from 'fs';

const code = fs.readFileSync('src/App.tsx', 'utf-8');

interface Tag {
  name: string;
  line: number;
  col: number;
}

const fileLines = code.split('\n');
const tagStack: Tag[] = [];

// Since there is JS code inside, we only care about HTML tags within JSX return statements.
// To make it simple, let's parse using a state machine.
let inComment = false;
let inString: string | null = null;
let currentTag = '';
let isClosing = false;
let isSelfClosing = false;
let isInsideTag = false;

for (let r = 0; r < fileLines.length; r++) {
  const lineStr = fileLines[r];
  const lineNum = r + 1;
  
  for (let c = 0; c < lineStr.length; c++) {
    const char = lineStr[c];
    const next = lineStr[c + 1] || '';
    
    // Ignore pure string matches (with single/double quotes)
    if (inString) {
      if (char === '\\') {
        c++; // skip next char
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      // Only care about strings if not inside tag definition
      if (!isInsideTag) {
        inString = char;
        continue;
      }
    }

    // Inside tag
    if (isInsideTag) {
      if (char === '>') {
        isInsideTag = false;
        const name = currentTag.trim().split(/\s+/)[0];
        if (name && !name.startsWith('!') && !name.startsWith('?')) {
          if (isSelfClosing) {
            // self closing, ignore
          } else if (isClosing) {
            // pop and verify
            const popped = tagStack.pop();
            if (!popped) {
              console.log(`Unmatched closing tag: </${name}> at line ${lineNum}, col ${c}`);
            } else if (popped.name !== name) {
              console.log(`Mismatched tags: Opened <${popped.name}> at line ${popped.line}, but closed with </${name}> at line ${lineNum}`);
            }
          } else {
            // open tag
            tagStack.push({ name, line: lineNum, col: c });
          }
        }
        currentTag = '';
        isClosing = false;
        isSelfClosing = false;
        continue;
      }
      
      if (char === '/' && next === '>') {
        isSelfClosing = true;
      }
      
      currentTag += char;
      continue;
    }

    // Direct HTML tags start with '<' followed by an alphabetical letter, or '/'
    if (char === '<') {
      const isLetterOrSlash = /[a-zA-Z/]/.test(next);
      if (isLetterOrSlash) {
        isInsideTag = true;
        if (next === '/') {
          isClosing = true;
          c++; // skip the slash
        } else {
          isClosing = false;
        }
        currentTag = '';
        continue;
      }
    }
  }
}

if (tagStack.length > 0) {
  console.log(`Unclosed JSX elements left (${tagStack.length}):`);
  for (const t of tagStack.reverse().slice(0, 10)) {
    console.log(`- <${t.name}> opened at line ${t.line}`);
  }
} else {
  console.log('All JSX tags are successfully matched!');
}
