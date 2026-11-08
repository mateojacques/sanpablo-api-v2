import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('postgres', async (importOriginal) => {
  const actual = await importOriginal<typeof import('postgres')>();
  return { default: vi.fn(actual.default) };
});

async function tlsModeFor(databaseUrl: string): Promise<unknown> {
  vi.resetModules();
  vi.doMock('./env.js', () => ({
    env: { DATABASE_URL: databaseUrl, NODE_ENV: 'production' },
  }));

  const postgres = (await import('postgres')).default;
  vi.mocked(postgres).mockClear();
  await import('./database.js');

  return vi.mocked(postgres).mock.results[0].value.options.ssl;
}

describe('database connection in production', () => {
  afterEach(() => {
    vi.doUnmock('./env.js');
  });

  it('connects to the internal host without TLS', async () => {
    expect(await tlsModeFor('postgresql://user:pass@dpg-internal-a/app')).toBe(false);
  });

  it('honors sslmode on the external URL', async () => {
    expect(
      await tlsModeFor(
        'postgresql://user:pass@dpg-x-a.oregon-postgres.render.com/app?sslmode=require'
      )
    ).toBe('require');
  });
});
