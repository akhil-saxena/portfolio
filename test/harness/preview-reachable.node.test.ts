import { describe, expect, inject, it } from 'vitest';

const previewBaseUrl = inject('previewBaseUrl');

describe('the built site is served over HTTP by real workerd', () => {
  it('was given a base URL by the global setup', () => {
    expect(previewBaseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it('answers the index route with 200 and the static build marker', async () => {
    const response = await fetch(`${previewBaseUrl}/`);

    expect(response.status).toBe(200);

    const body = await response.text();
    expect(body).toContain('home-render-ok');
  });
});
