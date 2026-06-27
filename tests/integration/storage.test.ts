import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { DatabaseManager, createDatabase } from '../../src/storage/database';
import { SQLiteRepository, createRepository } from '../../src/storage/repository';
import type { Job, IJobRepository } from '../../src/storage/types';

describe('SQLite Repository Integration', () => {
  let db: DatabaseManager;
  let repo: IJobRepository;

  beforeAll(() => {
    db = createDatabase(':memory:');
    repo = createRepository(db);
  });

  function makeJob(overrides: Partial<Job> = {}): Job {
    return {
      id: overrides.id || 'test-id-1',
      title: 'Firmware Engineer',
      company: 'NXP',
      location: 'Eindhoven',
      description: 'RTOS development',
      url: 'https://careers.nxp.com/job/1',
      applyUrl: 'https://careers.nxp.com/apply/1',
      source: 'greenhouse',
      sourceId: 'ext-1',
      postedDate: new Date('2026-06-01'),
      createdAt: new Date(),
      keywordsMatched: ['firmware'],
      ...overrides,
    };
  }

  describe('save and retrieve', () => {
    it('should save a job and retrieve it', async () => {
      const job = makeJob({ id: 'save-test-1' });
      await repo.save(job);

      const recent = await repo.getRecentJobs(10);
      const saved = recent.find((j) => j.id === 'save-test-1');
      expect(saved).toBeDefined();
      expect(saved!.title).toBe('Firmware Engineer');
      expect(saved!.company).toBe('NXP');
      expect(saved!.keywordsMatched).toEqual(['firmware']);
    });

    it('should retrieve multiple jobs', async () => {
      await repo.save(makeJob({ id: 'multi-1' }));
      await repo.save(makeJob({ id: 'multi-2' }));

      const recent = await repo.getRecentJobs(5);
      const ids = recent.map((j) => j.id);
      expect(ids).toContain('multi-1');
      expect(ids).toContain('multi-2');
    });

    it('should limit results', async () => {
      const recent = await repo.getRecentJobs(1);
      expect(recent).toHaveLength(1);
    });

    it('should handle keywords as JSON roundtrip', async () => {
      const job = makeJob({
        id: 'json-test',
        keywordsMatched: ['firmware', 'rtos', 'bare metal'],
      });
      await repo.save(job);

      const recent = await repo.getRecentJobs(10);
      const saved = recent.find((j) => j.id === 'json-test');
      expect(saved!.keywordsMatched).toEqual([
        'firmware',
        'rtos',
        'bare metal',
      ]);
    });
  });

  describe('dedup (seenExists / markSeen)', () => {
    it('should return false for unseen hash', async () => {
      const seen = await repo.seenExists('nonexistent-hash');
      expect(seen).toBe(false);
    });

    it('should return true for seen hash', async () => {
      await repo.save(makeJob({ id: 'dedup-seen-id' }));
      const hash = 'test-hash-123';
      await repo.markSeen(hash, 'dedup-seen-id');
      expect(await repo.seenExists(hash)).toBe(true);
    });

    it('should be idempotent for markSeen', async () => {
      await repo.save(makeJob({ id: 'dedup-idempotent-id' }));
      const hash = 'idempotent-hash';
      await repo.markSeen(hash, 'dedup-idempotent-id');
      // Calling again should not throw
      await expect(
        repo.markSeen(hash, 'dedup-idempotent-id')
      ).resolves.toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should delete old jobs', async () => {
      const oldId = 'cleanup-old';
      await repo.save(makeJob({ id: oldId }));
      // Directly set created_at to a past date to test cleanup
      const rawDb = db.getDatabase();
      rawDb
        .prepare("UPDATE jobs SET created_at = '2020-01-01' WHERE id = ?")
        .run(oldId);

      const deleted = await repo.cleanup(30); // delete jobs older than 30 days
      expect(deleted).toBeGreaterThan(0);

      const recent = await repo.getRecentJobs(10);
      const found = recent.find((j) => j.id === oldId);
      expect(found).toBeUndefined();
    });

    it('should not delete recent jobs', async () => {
      const recentId = 'recent-cleanup-test';
      await repo.save(makeJob({ id: recentId }));

      const deleted = await repo.cleanup(90);
      const recent = await repo.getRecentJobs(10);
      const found = recent.find((j) => j.id === recentId);
      expect(found).toBeDefined();
    });
  });
});
