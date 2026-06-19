import { test, expect } from '@playwright/test';

test.describe('RichDocumentEditor Select-All Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Make sure we're not running the AI analysis
    // Paste or create multi-block content
    const emptyInput = page.locator('textarea[aria-label="Vùng nhập tài liệu trống"]');
    await emptyInput.fill('Block 1\nBlock 2\nBlock 3');
    await page.getByRole('button', { name: 'Đưa nội dung vào tài liệu' }).click();
  });

  test('Ctrl+A document-level selection and Delete/Escape workflows', async ({ page, browserName }) => {
    const editorSurface = page.locator('[data-testid="document-editor-surface"]');
    await expect(editorSurface).toHaveAttribute('data-all-selected', 'false');

    // Click into the first block (which is a paragraph textarea)
    const firstBlock = page.locator('textarea[placeholder="Dán nội dung hoặc gõ nội dung văn bản..."]').first();
    await firstBlock.click();

    // Trigger Ctrl+A or Cmd+A based on OS/Browser. 
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await firstBlock.press(`${modifier}+a`);

    // Verify document-level selection is active
    await expect(editorSurface).toHaveAttribute('data-all-selected', 'true');

    // Escape cancels selection
    await page.keyboard.press('Escape');
    await expect(editorSurface).toHaveAttribute('data-all-selected', 'false');

    // Ctrl+A again
    await firstBlock.click();
    await firstBlock.press(`${modifier}+a`);
    await expect(editorSurface).toHaveAttribute('data-all-selected', 'true');

    // Backspace clears all
    await page.keyboard.press('Backspace');
    
    // Verify document is cleared (the empty input state should be visible)
    const emptyInput = page.locator('textarea[aria-label="Vùng nhập tài liệu trống"]');
    await expect(emptyInput).toBeVisible();
    await expect(editorSurface).toHaveAttribute('data-all-selected', 'false');
  });

  test('Toolbar selection and copy actions', async ({ page }) => {
    const editorSurface = page.locator('[data-testid="document-editor-surface"]');
    
    // Click "Chọn tất cả"
    await page.getByRole('button', { name: 'Chọn tất cả' }).click();
    await expect(editorSurface).toHaveAttribute('data-all-selected', 'true');

    // We can't trivially assert the clipboard in all environments, but we can 
    // click "Sao chép tất cả" and ensure no crash, and ideally check clipboard if permitted.
    // We'll just click it for now to ensure it runs.
    await page.getByRole('button', { name: 'Sao chép tất cả' }).click();
  });
});
