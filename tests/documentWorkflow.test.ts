import { describe, expect, it } from 'vitest';
import {
  createDocumentContent,
  DOCUMENT_SAMPLE_TEXT,
  insertDocumentContent,
  restoreDocumentContent,
  selectAnalysisInputText,
} from '../src/hooks/useDocumentWorkflow';
import { blocksToText, parseTextToBlocks } from '../src/lib/documentParser';
import type { WorkspaceDraftV1 } from '../src/lib/workspaceDraft';

describe('document workflow invariants', () => {
  it('paste raw then analyze uses intact raw text', () => {
    const raw = 'Raw  text\n\nwith preserved spacing';
    const content = insertDocumentContent([], raw, parseTextToBlocks(raw), 'replace');
    expect(selectAnalysisInputText(content.blocks, content.rawDocumentText, content.rawDocumentTextStale)).toBe(raw);
  });

  it('paste raw then edit then analyze uses blocksToText', () => {
    const pasted = insertDocumentContent([], 'Original raw', parseTextToBlocks('Original raw'), 'replace');
    const editedBlocks = parseTextToBlocks('Edited text');
    expect(selectAnalysisInputText(editedBlocks, pasted.rawDocumentText, true)).toBe(blocksToText(editedBlocks));
  });

  it('structured paste crosses the insertion boundary and preserves the whole merged document', () => {
    const existing = parseTextToBlocks('Existing section');
    const incoming = parseTextToBlocks('| A | B |\n|---|---|\n| 1 | 2 |');
    const merged = insertDocumentContent(existing, '| A | B |', incoming, 'merge');
    expect(merged.rawDocumentText).toBe(blocksToText(merged.blocks));
    expect(merged.rawDocumentTextStale).toBe(false);
    expect(selectAnalysisInputText(merged.blocks, merged.rawDocumentText, false)).toContain('Existing section');
  });

  it('import replace keeps raw and blocks aligned with the imported document only', () => {
    const imported = 'Imported document\nSecond line';
    const result = insertDocumentContent(parseTextToBlocks('Old document'), imported, parseTextToBlocks(imported), 'replace');
    expect(result.rawDocumentText).toBe(imported);
    expect(result.documentText).toBe(blocksToText(result.blocks));
    expect(result.documentText).not.toContain('Old document');
  });

  it('merge mode keeps raw and blocks aligned', () => {
    const result = insertDocumentContent(parseTextToBlocks('Old document'), 'New document', parseTextToBlocks('New document'), 'merge');
    expect(result.rawDocumentText).toBe(blocksToText(result.blocks));
    expect(result.rawDocumentText).toContain('Old document');
    expect(result.rawDocumentText).toContain('New document');
  });

  it('restore workspace restores raw, blocks, and stale state', () => {
    const draft = { documentText: 'Restored edit', rawDocumentText: 'Restored raw', rawDocumentTextStale: true } as WorkspaceDraftV1;
    const restored = restoreDocumentContent(draft);
    expect(restored.rawDocumentText).toBe('Restored raw');
    expect(restored.rawDocumentTextStale).toBe(true);
    expect(blocksToText(restored.blocks)).toBe('Restored edit');
  });

  it('editor insertion callback contract cannot diverge raw and blocks', () => {
    const onInsertContent = insertDocumentContent;
    const result = onInsertContent(parseTextToBlocks('Existing'), 'Pasted', parseTextToBlocks('Pasted'), 'merge');
    expect(result.rawDocumentText).toBe(result.documentText);
    expect(result.documentText).toBe(blocksToText(result.blocks));
  });

  it('sample content creates matching raw text and blocks', () => {
    const content = createDocumentContent(DOCUMENT_SAMPLE_TEXT);
    expect(content.rawDocumentText).toBe(DOCUMENT_SAMPLE_TEXT);
    expect(content.rawDocumentTextStale).toBe(false);
    expect(content.blocks.length).toBeGreaterThan(0);
  });
});
