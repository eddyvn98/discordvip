const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIRS = ["apps/server/src", "apps/admin/src", "docs"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"]);

// Common mojibake artifacts when UTF-8 text is decoded as latin1/win1252.
const SUSPECT_PATTERN = /(Ã.|Â.|Æ.|Ð.|â€|ðŸ|�|áº|á»)/;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }
    if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(fullPath);
    }
  }
  return acc;
}

const findings = [];
for (const relDir of TARGET_DIRS) {
  const absDir = path.join(ROOT, relDir);
  for (const filePath of walk(absDir)) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (SUSPECT_PATTERN.test(line)) {
        findings.push({
          filePath: path.relative(ROOT, filePath),
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }
}

if (findings.length > 0) {
  console.error("Phát hiện chuỗi nghi mojibake trong source:");
  for (const item of findings) {
    console.error(`- ${item.filePath}:${item.line}: ${item.text}`);
  }
  process.exit(1);
}

console.log("OK: Không phát hiện chuỗi mojibake trong source.");
