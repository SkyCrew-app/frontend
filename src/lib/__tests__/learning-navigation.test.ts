import { adjacentLessons, learningRoutes, videoEmbedUrl } from '../learning-navigation';

const course = {
  modules: [
    { lessons: [{ id: 12 }, { id: 3 }] },
    { lessons: [] },
    { lessons: [{ id: '40' }] },
  ],
};

describe('adjacentLessons', () => {
  it('suit l’ordre de lecture du cours, pas l’ordre des identifiants', () => {
    expect(adjacentLessons(course, 3)).toEqual({ previous: 12, next: 40, position: 2, total: 3 });
  });

  it('n’a pas de leçon précédente sur la première leçon', () => {
    expect(adjacentLessons(course, 12)).toEqual({ previous: null, next: 3, position: 1, total: 3 });
  });

  it('n’a pas de leçon suivante sur la dernière leçon', () => {
    expect(adjacentLessons(course, 40)).toEqual({ previous: 3, next: null, position: 3, total: 3 });
  });

  it('accepte l’identifiant tel qu’il vient de l’URL', () => {
    expect(adjacentLessons(course, '3').next).toBe(40);
  });

  it('ne propose rien pour une leçon étrangère au cours', () => {
    expect(adjacentLessons(course, 13)).toEqual({ previous: null, next: null, position: null, total: 3 });
    expect(adjacentLessons(course, 'abc').position).toBeNull();
  });

  it('ne propose rien tant que le cours n’est pas chargé', () => {
    expect(adjacentLessons(null, 3)).toEqual({ previous: null, next: null, position: null, total: 0 });
    expect(adjacentLessons(undefined, 3).next).toBeNull();
  });

  it('gère un cours d’une seule leçon', () => {
    expect(adjacentLessons({ modules: [{ lessons: [{ id: 5 }] }] }, 5)).toEqual({
      previous: null,
      next: null,
      position: 1,
      total: 1,
    });
  });
});

describe('learningRoutes', () => {
  it('ne produit que des chemins absolus', () => {
    const paths = [
      learningRoutes.home,
      learningRoutes.courses,
      learningRoutes.course(4),
      learningRoutes.eLearning,
      learningRoutes.eLearningCourse(4),
      learningRoutes.lesson(4, 9),
      learningRoutes.evaluations,
      learningRoutes.evaluation('7'),
    ];
    for (const path of paths) expect(path.startsWith('/instruction')).toBe(true);
  });

  it('pointe vers les routes de l’application', () => {
    expect(learningRoutes.eLearningCourse(4)).toBe('/instruction/e-learning/4');
    expect(learningRoutes.lesson(4, 9)).toBe('/instruction/e-learning/4/9');
    expect(learningRoutes.evaluation('7')).toBe('/instruction/evaluation/7');
    expect(learningRoutes.course(2)).toBe('/instruction/courses/2');
  });
});

describe('videoEmbedUrl', () => {
  it('transforme un lien YouTube en adresse de lecteur', () => {
    expect(videoEmbedUrl('https://www.youtube.com/watch?v=abc_123-x')).toBe('https://www.youtube.com/embed/abc_123-x');
    expect(videoEmbedUrl('https://www.youtube.com/watch?list=PL1&v=abc')).toBe('https://www.youtube.com/embed/abc');
    expect(videoEmbedUrl('https://youtu.be/abc?t=10')).toBe('https://www.youtube.com/embed/abc');
  });

  it('laisse les autres liens tels quels', () => {
    expect(videoEmbedUrl('https://www.youtube.com/embed/abc')).toBe('https://www.youtube.com/embed/abc');
    expect(videoEmbedUrl(' https://player.vimeo.com/video/1 ')).toBe('https://player.vimeo.com/video/1');
  });

  it('vaut null sans lien', () => {
    expect(videoEmbedUrl('')).toBeNull();
    expect(videoEmbedUrl(null)).toBeNull();
  });
});
