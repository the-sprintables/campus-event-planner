import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8000';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/register');

    // Fill in registration form - use placeholder-based selectors
    await page.fill('input[placeholder*="name" i]', 'E2E Test User');
    await page.fill('input[type="email"]', `e2e-test-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'testpassword123');

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
    await expect(page.locator('text=/Please Login/i')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page, request }) => {
    // First, create a user via API
    const email = `login-test-${Date.now()}@example.com`;
    const registerResponse = await request.post(`${API_BASE_URL}/signup`, {
      data: {
        email,
        password: 'testpassword123',
        name: 'Login Test User',
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    // Now test login
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'testpassword123');
    
    // Select role (required by the login form)
    const userRoleButton = page.locator('button:has-text("User")');
    await userRoleButton.click();
    // Wait for the button to be in selected state (should not have "ghost" class)
    await expect(userRoleButton).not.toHaveClass(/ghost/, { timeout: 2000 });

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for successful login - logout button should appear
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 10000 });
    
    // Verify we're no longer on the login page
    await expect(page).not.toHaveURL(/.*\/login/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Select role (required)
    const userRoleButton = page.locator('button:has-text("User")');
    await userRoleButton.click();
    // Wait for the button to be in selected state
    await expect(userRoleButton).not.toHaveClass(/ghost/, { timeout: 2000 });

    // Submit the form
    await page.click('button[type="submit"]');

    // Should show error message - wait a bit for the error to appear
    await page.waitForTimeout(1000);
    // Try multiple selectors separately
    const errorElement = page.locator('.error').or(page.locator('[class*="error"]')).or(page.locator('text=/invalid|incorrect|error|credentials/i'));
    await expect(errorElement.first()).toBeVisible({ timeout: 3000 });
  });

  test('should logout successfully', async ({ page, request }) => {
    // Create and login user via API
    const email = `logout-test-${Date.now()}@example.com`;
    await request.post(`${API_BASE_URL}/signup`, {
      data: {
        email,
        password: 'testpassword123',
        name: 'Logout Test User',
      },
    });

    const loginResponse = await request.post(`${API_BASE_URL}/login`, {
      data: {
        email,
        password: 'testpassword123',
      },
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Set token and session in localStorage (auth.ts requires both)
    await page.goto('/');
    await page.evaluate(({ token, email }) => {
      localStorage.setItem('auth_token', token);
      // Also set the session that currentUser() checks
      localStorage.setItem('app_session', JSON.stringify({
        email: email,
        userId: 1,
        role: 'user'
      }));
    }, { token, email });

    // Reload page to apply auth
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for auth state to apply

    // Click logout button - check header/nav area
    const logoutButton = page.locator('button:has-text("Logout")').first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();
    await page.waitForTimeout(1000);

    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Try to access protected route (root is protected)
    await page.goto('/', { waitUntil: 'networkidle' });

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
  });
});

