/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { parseHtmlToBlocks, blocksToText } from '../src/lib/documentParser';

describe('documentParser Spacing and Preservation', () => {
  it('should prevent joined words when parsing adjacent blocks', () => {
    // Simulated innerText behavior for adjacent blocks where user pasted text
    const html = `<div><p>trực quan hóa:</p><p>Tạo</p></div>`;
    const blocks = parseHtmlToBlocks(html, '');
    
    // We expect paragraph blocks. If the parser flattened them into one paragraph,
    // they should have a space between them, not joined.
    const text = blocksToText(blocks);
    
    // Check that there is no 'trực quan hóa:Tạo'
    expect(text).not.toContain('trực quan hóa:Tạo');
    // They should be safely separated by space or newlines
    expect(text.includes('trực quan hóa: Tạo') || text.includes('trực quan hóa:\n\nTạo')).toBe(true);
  });

  it('should prevent joined words in table cells', () => {
    const html = `
      <table>
        <tr>
          <th>dọc</th>
          <th>Đơn vị</th>
        </tr>
        <tr>
          <td><p>đồng</p><p>Mục tiêu</p></td>
          <td>Giá trị</td>
        </tr>
      </table>
    `;
    const blocks = parseHtmlToBlocks(html, '');
    const text = blocksToText(blocks);
    
    // Cells should not contain newlines that break markdown
    // and words should not be joined
    expect(text).not.toContain('dọcĐơn vị');
    expect(text).not.toContain('đồngMục tiêu');
    
    // It should have a space
    expect(text).toContain('đồng Mục tiêu');
  });

  it('should safely preserve punctuation spaces without adding extra spaces before punctuation', () => {
    const html = `<p>This is a test, with punctuation. And another sentence!</p>`;
    const blocks = parseHtmlToBlocks(html, '');
    const text = blocksToText(blocks);
    
    expect(text).toContain('This is a test, with punctuation. And another sentence!');
    expect(text).not.toContain('test ,');
    expect(text).not.toContain('punctuation .');
  });
});
