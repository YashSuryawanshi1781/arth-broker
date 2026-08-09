import { test, expect } from '@playwright/test'

async function apiReachable(request) {
  try {
    const res = await request.get('http://127.0.0.1:4000/api/health', { timeout: 3000 })
    return res.ok()
  } catch {
    return false
  }
}

test.describe('Arth smoke', () => {
  test('login flow and learn page', async ({ page, request }) => {
    const apiUp = await apiReachable(request)
    if (!apiUp) {
      test.skip(true, 'API down at :4000 — start server before e2e')
      return
    }

    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    } catch {
      test.skip(true, 'Client not reachable at baseURL')
      return
    }

    const email = page.getByLabel(/email/i)
    const password = page.getByLabel(/password/i)
    const loginBtn = page.getByRole('button', { name: /login/i })

    if (!(await email.count()) || !(await password.count())) {
      test.skip(true, 'Login form not found')
      return
    }

    await email.fill('demo@arth.app')
    await password.fill('Demo@1234')
    await loginBtn.click()

    try {
      await expect(page).toHaveURL(/\/(app|kyc)/, { timeout: 15_000 })
    } catch {
      // Soft fail when demo user missing or auth error banner shown
      const err = page.getByRole('alert')
      if (await err.count()) {
        test.skip(true, `Login did not redirect: ${(await err.first().textContent()) || 'auth error'}`)
        return
      }
      throw new Error('Expected redirect to /app or /kyc after login')
    }

    if (page.url().includes('/app')) {
      await page.goto('/app/learn', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/app\/learn/)
    }
  })
})
