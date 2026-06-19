import { ResolvedFigureExportMetadata } from "./figureCaptionMetadata";

export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
}

function splitTextIntoLines(text: string, maxCharsPerLine: number = 90): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        lines.push(word);
        currentLine = '';
      }
    } else {
      currentLine += word + ' ';
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  return lines;
}

export function buildAcademicExportSvg(args: {
  svgElement: SVGSVGElement;
  metadata: ResolvedFigureExportMetadata;
  title?: string;
  options?: {
    background?: string;
    footerFontFamily?: string;
    maxLineLength?: number;
  };
}): string {
  const { svgElement, metadata, title, options = {} } = args;
  const {
    background = "#f8fafc",
    footerFontFamily = "Inter, ui-sans-serif, system-ui, sans-serif",
    maxLineLength = 90
  } = options;

  const originalSvgStr = new XMLSerializer().serializeToString(svgElement);
  
  const viewBox = svgElement.viewBox.baseVal;
  const originalWidth = viewBox.width || 800;
  const originalHeight = viewBox.height || 500;
  
  // Calculate heights
  let extraHeight = 0;
  
  const titleLines = splitTextIntoLines(title || '', 80);
  const rawCaption = metadata.isPreview ? metadata.captionText : (metadata.numberedCaption || '');
  const captionLines = splitTextIntoLines(rawCaption.replace(/\r\n|\r|\n/g, ' '), maxLineLength);
  
  const rawSource = metadata.sourceCitation ? `Nguồn: ${metadata.sourceCitation.replace(/\r\n|\r|\n/g, ' ')}` : '';
  const sourceLines = splitTextIntoLines(rawSource, Math.floor(maxLineLength * 1.2)); // allow slightly longer line for source
  
  if (titleLines.length > 0) extraHeight += titleLines.length * 24 + 16;
  if (captionLines.length > 0) extraHeight += captionLines.length * 20 + 16;
  if (sourceLines.length > 0) extraHeight += sourceLines.length * 16 + 16;
  
  if (extraHeight > 0) extraHeight += 24; // Extra padding
  
  const newWidth = originalWidth;
  const newHeight = originalHeight + extraHeight;
  
  let currentY = originalHeight + 24; // start drawing footer here
  
  let textElements = '';
  
  const drawBg = `<rect width="${newWidth}" height="${newHeight}" fill="${background}" />`;
  
  if (titleLines.length > 0) {
    for (const tl of titleLines) {
      textElements += `<text x="40" y="${currentY}" font-family="${footerFontFamily}" font-weight="900" font-size="16" fill="#020617" text-transform="uppercase" letter-spacing="-0.025em">${escapeXml(tl)}</text>\n`;
      currentY += 24;
    }
    currentY += 8;
  }
  
  if (captionLines.length > 0) {
    for (const cl of captionLines) {
      textElements += `<text x="40" y="${currentY}" font-family="${footerFontFamily}" font-weight="700" font-size="14" font-style="italic" fill="#1e293b">${escapeXml(cl)}</text>\n`;
      currentY += 20;
    }
    currentY += 8;
  }
  
  if (sourceLines.length > 0) {
    for (const sl of sourceLines) {
      textElements += `<text x="40" y="${currentY}" font-family="${footerFontFamily}" font-weight="400" font-style="italic" font-size="11" fill="#64748b">${escapeXml(sl)}</text>\n`;
      currentY += 16;
    }
  }

  // Create wrapper SVG
  const wrapperSvg = `
    <svg width="${newWidth}" height="${newHeight}" viewBox="0 0 ${newWidth} ${newHeight}" xmlns="http://www.w3.org/2000/svg">
      ${drawBg}
      <svg x="0" y="0" width="${originalWidth}" height="${originalHeight}">
        ${originalSvgStr}
      </svg>
      ${textElements}
    </svg>
  `;
  
  return wrapperSvg.trim();
}

export function buildPngExportSvgWithFooter(args: {
  svgElement: SVGSVGElement;
  metadata: ResolvedFigureExportMetadata;
  title?: string;
}): string {
  return buildAcademicExportSvg({
    svgElement: args.svgElement,
    metadata: args.metadata,
    title: args.title,
    options: {
      maxLineLength: 100
    }
  });
}
