export interface NumericBulletRow {
  area?: string;
  category: string;
  value: number;
  unit: string;
  displayLabel: string;
}

export interface ExtractedNumericBulletDataset {
  rows: NumericBulletRow[];
  canonicalUnit?: string;
}

/**
 * Deterministically parses Vietnamese numeric bullet lists into structured rows.
 * Examples:
 * "Hải Phòng - ca nô: 5 phương tiện" -> { area: "Hải Phòng", category: "ca nô", value: 5, unit: "phương tiện", displayLabel: "Hải Phòng - ca nô" }
 * "Hà Nội: 100 người" -> { category: "Hà Nội", value: 100, unit: "người", displayLabel: "Hà Nội" }
 * "- Hà Nội: 100 người" -> ignores leading bullets
 */
export function extractNumericBullets(text: string): ExtractedNumericBulletDataset {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const rows: NumericBulletRow[] = [];
  
  // Matches optional bullet, label part, value, optional unit
  // e.g. "- Hải Phòng - ca nô: 5 phương tiện"
  // Group 1: Label part ("Hải Phòng - ca nô")
  // Group 2: Value ("5", "5.5", "5,5")
  // Group 3: Unit ("phương tiện")
  const bulletRegex = /^(?:[-*•\d]+\.?\s+)?(.*?):\s*([\d.,]+)\s*(.*)$/i;
  
  for (const line of lines) {
    const match = line.match(bulletRegex);
    if (!match) continue;
    
    const labelPart = match[1].trim();
    const valueStr = match[2].trim().replace(/,/g, '.'); // handle Vietnamese comma decimal
    const unitPart = match[3].trim();
    
    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;
    
    // Attempt to split label into area and category
    // "Hải Phòng - ca nô" -> area: "Hải Phòng", category: "ca nô"
    let area: string | undefined;
    let category = labelPart;
    
    const dashSplit = labelPart.split(/\s+-\s+/);
    if (dashSplit.length === 2) {
      area = dashSplit[0].trim();
      category = dashSplit[1].trim();
    } else if (dashSplit.length > 2) {
       category = dashSplit.pop()!.trim();
       area = dashSplit.join(' - ').trim();
    }
    
    rows.push({
      area,
      category,
      value,
      unit: unitPart,
      displayLabel: labelPart
    });
  }
  
  if (rows.length === 0) {
    return { rows: [] };
  }
  
  // Check if all rows share the exact same unit
  const firstUnit = rows[0].unit;
  const sameUnit = rows.every(r => r.unit === firstUnit);
  
  return {
    rows,
    canonicalUnit: sameUnit && firstUnit !== "" ? firstUnit : undefined
  };
}
