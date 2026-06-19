import { test, expect } from '@playwright/test';

test.describe('Missing Payload Guard', () => {
  test('candidates without renderable payload should not be actionable', async ({ page }) => {
    await page.goto('/');

    // Need to click add paragraph button first
    const addParaBtn = page.getByRole('button', { name: /Đoạn văn|Paragraph/i }).first();
    await addParaBtn.click();

    // Wait for the textarea
    const textArea = page.getByPlaceholder(/dán nội dung|hoặc gõ/i).first();
    await expect(textArea).toBeVisible({ timeout: 15000 });

    const input = `Báo cáo sản lượng 5 tháng đầu năm 2026

Sản lượng hoa tiêu đạt 21.899 lượt, bằng 106% so với cùng kỳ.
Tổng dung tích tàu đạt 4.011 triệu GT, bằng 111% so với cùng kỳ.
Doanh thu tăng trưởng ổn định.
Các nhóm nội dung chính gồm: sản lượng, doanh thu, an toàn hàng hải, phương tiện và nhân sự hoa tiêu.`;

    await textArea.fill(input);

    // Click Analyze
    const analyzeBtn = page.getByRole('button', { name: /Phân tích/i }).first();
    await analyzeBtn.click();

    // Wait for candidates
    await expect(page.getByText(/Gợi ý bản vẽ|Đề xuất AI/i).first()).toBeVisible({ timeout: 60000 });
    
    const cards = page.getByTestId('candidate-card');
    await expect(cards.first()).toBeVisible({ timeout: 20000 });

    // Ensure no crash or unexpected token
    await expect(page.getByText("Unexpected token '<'")).toBeHidden();
    
    // Inspect actionable cards
    const count = await cards.count();
    let clickedMissingPayload = false;

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const text = await card.innerText();
      console.log(`Card ${i} text: ${text}`);
      
      // If it's marked as ready or has DÙNG MẪU NÀY
      if (text.includes('DÙNG MẪU NÀY') || text.includes('sẵn sàng dùng')) {
        await card.click();
        
        // Wait for potential toast
        await page.waitForTimeout(500);

        // Check for the error toast
        const chartError = page.getByText(/missing its chart payload/i);
        const tableError = page.getByText(/missing its table payload/i);
        
        const hasChartError = await chartError.isVisible();
        const hasTableError = await tableError.isVisible();
        
        if (hasChartError || hasTableError) {
          clickedMissingPayload = true;
          expect(hasChartError || hasTableError).toBe(false);
        }
      }
    }
    
    // If we didn't find any actionable cards, that's suspicious
    console.log(`Found ${count} cards. Did we click any? ${clickedMissingPayload}`);
  });
});
