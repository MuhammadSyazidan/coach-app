import { availableWeights, buildStrengthItems, progress } from '../strength/progression';
import type { SetLog } from '../types';

const log = (reps: number[], loadKg: number, rpe = 7): SetLog[] =>
  reps.map((r, i) => ({ id: String(i), sessionId: 's', date: '2026-11-20', exerciseId: 'goblet-squat', setIndex: i, reps: r, loadKg, rpe }));

describe('availableWeights', () => {
  it('adjustable menghasilkan rentang dengan langkah', () => {
    expect(availableWeights({ adjustable: true, weightsKg: [], minKg: 2, maxKg: 10, stepKg: 2 })).toEqual([2, 4, 6, 8, 10]);
  });
  it('dumbbell tetap memakai daftar berat, terurut dan unik', () => {
    expect(availableWeights({ adjustable: false, weightsKg: [10, 5, 5, 7.5], minKg: 0, maxKg: 0, stepKg: 0 })).toEqual([5, 7.5, 10]);
  });
});

describe('progress (double progression)', () => {
  const item = { exerciseId: 'goblet-squat', repMin: 8, repMax: 12 };
  const w = [4, 6, 8, 10, 12];
  it('naik satu langkah saat semua set mencapai batas atas dengan RPE <= 8', () => {
    expect(progress(item, [log([12, 12, 12], 8, 7)], w)?.loadKg).toBe(10);
  });
  it('tetap saat belum mencapai batas atas', () => {
    expect(progress(item, [log([12, 10, 9], 8)], w)?.loadKg).toBe(8);
  });
  it('turun setelah dua sesi gagal mencapai batas bawah', () => {
    expect(progress(item, [log([7, 6, 6], 10), log([7, 7, 6], 10)], w)?.loadKg).toBe(8);
  });
  it('memberi saran lain ketika beban sudah maksimal', () => {
    const r = progress(item, [log([12, 12, 12], 12, 6)], w);
    expect(r?.loadKg).toBe(12);
    expect(r?.note).toMatch(/maksimal/);
  });
});

describe('buildStrengthItems', () => {
  it('template trail memuat core dan latihan kaki satu sisi', () => {
    const items = buildStrengthItems('trail', { level: 'menengah', bench: false, weights: [2, 4, 6, 8], history: () => [] });
    const ids = items.map((i) => i.exerciseId);
    expect(ids).toEqual(expect.arrayContaining(['dead-bug', 'sl-rdl', 'sl-calf-raise']));
    expect(ids).not.toContain('step-up'); // butuh bangku
  });
});
