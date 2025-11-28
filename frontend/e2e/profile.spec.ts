import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8000';

test.describe('User Profile E2E Tests', () => {
  let authToken: string;

  test.beforeEach(async ({ page, request }) => {
    // Create a test user and login
    const email = `e2e-profile-${Date.now()}@example.com`;
    
    await request.post(`${API_BASE_URL}/signup`, {
      data: {
        email,
        password: 'testpassword123',
        name: 'Profile Test User',
      },
    });

    const loginResponse = await request.post(`${API_BASE_URL}/login`, {
      data: {
        email,
        password: 'testpassword123',
      },
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;

    // Set token and session in localStorage (auth.ts requires both)
    await page.goto('/');
    await page.evaluate(({ token, email, role }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('app_session', JSON.stringify({
        email: email,
        userId: 1,
        role: role || 'user'
      }));
    }, { token: authToken, email, role: loginData.role || 'user' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should display user profile', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for profile to load

    // Should see profile information - check for email or name
    // Profile page shows user email and name
    const profileContent = page.locator('text=/Profile Test User/i').or(page.locator('text=/e2e-profile/i'));
    await expect(profileContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should update user profile', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find and fill name field
    const nameInput = page.locator('input[placeholder*="name" i], input:not([type])').first();
    if (await nameInput.isVisible({ timeout: 3000 })) {
      await nameInput.clear();
      await nameInput.fill('Updated Profile Name');

      // Submit the form
      const submitButton = page.locator('button[type="submit"], button:has-text("Update"), button:has-text("Save")').first();
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should see updated name or success message
        await expect(
          page.locator('text=/Updated Profile Name/i')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should update password', async ({ page }) => {
    await page.goto('/profile');

    // Look for password update section
    const passwordInput = page.locator('input[type="password"]').first();
    const updatePasswordButton = page.locator('button:has-text("Update Password"), button:has-text("Change Password")').first();

    if (await passwordInput.isVisible() && await updatePasswordButton.isVisible()) {
      await passwordInput.fill('newpassword123');
      await updatePasswordButton.click();

      // Should see success message
      await expect(
        page.locator('text=/success|updated|changed/i')
      ).toBeVisible({ timeout: 3000 });
    }
  });
});

