import {
  averageScore,
  courseLessonIds,
  evaluationsToTake,
  latestEvaluationAttempts,
  lessonTotals,
  moduleProgress,
  nextLessonId,
  percentage,
  stableIndex,
} from '../learning-progress';

const course = {
  modules: [
    { lessons: [{ id: 4 }, { id: 7 }] },
    { lessons: [] },
    { lessons: [{ id: '2' }] },
  ],
};

describe('percentage', () => {
  it('arrondit la part réalisée', () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
    expect(percentage(3, 3)).toBe(100);
  });

  it('vaut 0 quand il n’y a rien à faire', () => {
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(2, 0)).toBe(0);
  });

  it('ne dépasse jamais 100', () => {
    expect(percentage(5, 3)).toBe(100);
  });
});

describe('courseLessonIds', () => {
  it('liste les leçons dans l’ordre des modules', () => {
    expect(courseLessonIds(course)).toEqual([4, 7, 2]);
  });

  it('accepte un cours absent', () => {
    expect(courseLessonIds(null)).toEqual([]);
  });
});

describe('moduleProgress', () => {
  it('compte les leçons terminées du module', () => {
    expect(moduleProgress(course.modules[0].lessons, new Set([7, 2]))).toBe(50);
  });

  it('vaut 0 pour un module sans leçon', () => {
    expect(moduleProgress([], new Set([7]))).toBe(0);
  });
});

describe('nextLessonId', () => {
  it('propose la première leçon non terminée', () => {
    expect(nextLessonId(course, new Set([4]))).toBe(7);
    expect(nextLessonId(course, new Set([4, 7]))).toBe(2);
  });

  it('revient à la première leçon quand tout est terminé', () => {
    expect(nextLessonId(course, new Set([4, 7, 2]))).toBe(4);
  });

  it('ne propose rien pour un cours sans leçon', () => {
    expect(nextLessonId({ modules: [] }, new Set())).toBeNull();
  });
});

describe('latestEvaluationAttempts', () => {
  const attempt = (id: number, evaluationId: number, completed_at: string | null, score = 50) => ({
    id,
    score,
    passed: score >= 70,
    completed_at,
    evaluation: { id: evaluationId },
  });

  it('garde la tentative la plus récente de chaque évaluation', () => {
    const latest = latestEvaluationAttempts([
      attempt(1, 10, '2026-03-01T10:00:00.000Z', 40),
      attempt(2, 10, '2026-03-05T10:00:00.000Z', 90),
      attempt(3, 11, '2026-03-02T10:00:00.000Z', 60),
    ]);

    expect(latest.get(10)?.score).toBe(90);
    expect(latest.get(11)?.score).toBe(60);
    expect(latest.size).toBe(2);
  });

  it('ne dépend pas de l’ordre de la liste', () => {
    const latest = latestEvaluationAttempts([
      attempt(2, 10, '2026-03-05T10:00:00.000Z', 90),
      attempt(1, 10, '2026-03-01T10:00:00.000Z', 40),
    ]);

    expect(latest.get(10)?.id).toBe(2);
  });

  it('départage par identifiant quand la date manque', () => {
    const latest = latestEvaluationAttempts([attempt(5, 10, null, 80), attempt(4, 10, null, 20)]);

    expect(latest.get(10)?.id).toBe(5);
  });

  it('ignore les lignes sans évaluation', () => {
    const latest = latestEvaluationAttempts([
      { id: 1, score: 80, passed: true, completed_at: null, evaluation: null },
    ]);

    expect(latest.size).toBe(0);
  });

  it('accepte une liste absente', () => {
    expect(latestEvaluationAttempts(undefined).size).toBe(0);
  });
});

describe('lessonTotals', () => {
  it('additionne les leçons de tous les cours', () => {
    expect(
      lessonTotals([
        { completedLessons: 2, totalLessons: 5 },
        { completedLessons: 0, totalLessons: 3 },
      ]),
    ).toEqual({ completed: 2, total: 8 });
  });

  it('vaut zéro sans cours', () => {
    expect(lessonTotals(undefined)).toEqual({ completed: 0, total: 0 });
  });
});

describe('stableIndex', () => {
  it('donne toujours le même index pour le même cours', () => {
    expect(stableIndex(42, 12)).toBe(stableIndex('42', 12));
    expect(stableIndex(42, 12)).toBe(stableIndex(42, 12));
  });

  it('reste dans les bornes', () => {
    for (let seed = 0; seed < 50; seed++) {
      const index = stableIndex(seed, 12);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(12);
    }
  });

  it('vaut 0 pour une liste vide', () => {
    expect(stableIndex(3, 0)).toBe(0);
  });
});

describe('evaluationsToTake', () => {
  const attempt = (id: number, evaluationId: number, passed: boolean) => ({
    id,
    score: passed ? 90 : 40,
    passed,
    completed_at: '2026-10-01T10:00:00Z',
    evaluation: { id: evaluationId },
  });

  it('garde les évaluations jamais passées ou échouées à la dernière tentative', () => {
    const latest = latestEvaluationAttempts([attempt(1, 10, true), attempt(2, 11, false)]);
    expect(evaluationsToTake([{ id: 10 }, { id: 11 }, { id: '12' }], latest)).toEqual([{ id: 11 }, { id: '12' }]);
  });

  it('accepte une liste absente', () => {
    expect(evaluationsToTake(null, new Map())).toEqual([]);
  });
});

describe('averageScore', () => {
  const scored = (id: number, score: number | null) => ({ id, score, passed: false, completed_at: null });

  it('fait la moyenne arrondie des tentatives notées', () => {
    expect(averageScore([scored(1, 80), scored(2, 65), scored(3, null)])).toBe(73);
  });

  it('vaut null sans tentative notée', () => {
    expect(averageScore([])).toBeNull();
    expect(averageScore([scored(1, null)])).toBeNull();
  });
});
