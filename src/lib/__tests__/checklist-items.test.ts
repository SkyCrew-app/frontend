import {
  buildCreateChecklistItemInput,
  buildUpdateChecklistItemInput,
  checklistStatus,
  submissionProgress,
  groupItemsByCategory,
  nextSortOrder,
  reorderItemIds,
  toChecklistItemDraft,
} from '../checklist-items';
import type { ChecklistItem } from '@/interfaces/checklist';

const item = (
  id: number | string,
  category: string,
  sort_order: number,
  extra: Partial<ChecklistItem> = {},
): ChecklistItem => ({
  id,
  item_name: `Item ${id}`,
  category,
  is_required: true,
  sort_order,
  ...extra,
});

// Display order: EXTERIOR (3, 1), COCKPIT (2, 5), ENGINE (4)
const items = [
  item(1, 'EXTERIOR', 1),
  item(2, 'COCKPIT', 0),
  item(3, 'EXTERIOR', 0),
  item(4, 'ENGINE', 7),
  item(5, 'COCKPIT', 4),
];

describe('groupItemsByCategory', () => {
  it("regroupe par catégorie dans l'ordre d'affichage et trie chaque groupe", () => {
    expect(
      groupItemsByCategory(items).map((group) => [
        group.category,
        group.items.map((entry) => entry.id),
      ]),
    ).toEqual([
      ['EXTERIOR', [3, 1]],
      ['COCKPIT', [2, 5]],
      ['ENGINE', [4]],
    ]);
  });

  it("départage les items de même rang par identifiant", () => {
    const tied = [item(9, 'ENGINE', 2), item(8, 'ENGINE', 2)];

    expect(groupItemsByCategory(tied)[0].items.map((entry) => entry.id)).toEqual([8, 9]);
  });

  it('ne modifie pas la liste reçue', () => {
    const copy = [...items];
    groupItemsByCategory(items);

    expect(items).toEqual(copy);
  });
});

describe('reorderItemIds', () => {
  it("renvoie tous les items du modèle dans leur nouvel ordre", () => {
    expect(reorderItemIds(items, 'COCKPIT', 1, 0)).toEqual([3, 1, 5, 2, 4]);
    expect(reorderItemIds(items, 'EXTERIOR', 0, 1)).toEqual([1, 3, 2, 5, 4]);
  });

  it('convertit les identifiants en entiers', () => {
    const withStringIds = [item('11', 'ENGINE', 0), item('12', 'ENGINE', 1)];

    expect(reorderItemIds(withStringIds, 'ENGINE', 0, 1)).toEqual([12, 11]);
  });

  it("renvoie null quand rien ne bouge ou que le déplacement est invalide", () => {
    expect(reorderItemIds(items, 'COCKPIT', 1, 1)).toBeNull();
    expect(reorderItemIds(items, 'COCKPIT', 0, 2)).toBeNull();
    expect(reorderItemIds(items, 'COCKPIT', -1, 0)).toBeNull();
    expect(reorderItemIds(items, 'DOCUMENTS', 0, 1)).toBeNull();
  });

  it("renvoie null quand un identifiant n'est pas un entier", () => {
    const broken = [item('abc', 'ENGINE', 0), item(2, 'ENGINE', 1)];

    expect(reorderItemIds(broken, 'ENGINE', 0, 1)).toBeNull();
  });
});

describe('nextSortOrder', () => {
  it('place le nouvel item après tous les autres', () => {
    expect(nextSortOrder(items)).toBe(8);
    expect(nextSortOrder([])).toBe(0);
  });
});

describe('buildCreateChecklistItemInput', () => {
  const draft = {
    item_name: "  Niveau d'huile ",
    description: ' Jauge ',
    category: 'engine',
    is_required: false,
  };

  it("construit l'input attendu par l'API", () => {
    expect(buildCreateChecklistItemInput('12', draft, items)).toEqual({
      templateId: 12,
      item_name: "Niveau d'huile",
      description: 'Jauge',
      category: 'ENGINE',
      is_required: false,
      sort_order: 8,
    });
  });

  it('renvoie null sans modèle valide ou sans nom', () => {
    expect(buildCreateChecklistItemInput(Number.NaN, draft, items)).toBeNull();
    expect(buildCreateChecklistItemInput(12, { ...draft, item_name: '   ' }, items)).toBeNull();
  });
});

describe('buildUpdateChecklistItemInput', () => {
  const original = item(5, 'COCKPIT', 4, { description: 'Ancienne' });

  it('envoie les champs modifiables sans toucher au rang', () => {
    const input = buildUpdateChecklistItemInput(
      original,
      { item_name: ' Altimètre ', description: '', category: 'COCKPIT', is_required: false },
      items,
    );

    expect(input).toEqual({
      id: 5,
      item_name: 'Altimètre',
      description: '',
      category: 'COCKPIT',
      is_required: false,
    });
  });

  it("place l'item à la fin quand il change de catégorie", () => {
    const input = buildUpdateChecklistItemInput(
      original,
      { ...toChecklistItemDraft(original), category: 'DOCUMENTS' },
      items,
    );

    expect(input).toMatchObject({ id: 5, category: 'DOCUMENTS', sort_order: 8 });
  });

  it('renvoie null sans identifiant valide ou sans nom', () => {
    const draft = toChecklistItemDraft(original);

    expect(buildUpdateChecklistItemInput({ ...original, id: 'x' }, draft, items)).toBeNull();
    expect(buildUpdateChecklistItemInput(original, { ...draft, item_name: '' }, items)).toBeNull();
  });
});

describe('toChecklistItemDraft', () => {
  it("reprend les valeurs de l'item", () => {
    expect(toChecklistItemDraft(item(1, 'EXTERIOR', 0, { is_required: false }))).toEqual({
      item_name: 'Item 1',
      description: '',
      category: 'EXTERIOR',
      is_required: false,
    });
  });
});

describe('checklistStatus', () => {
  it('donne un libellé français et une couleur par statut', () => {
    expect(checklistStatus('IN_PROGRESS')).toEqual({ label: 'En cours', variant: 'info' });
    expect(checklistStatus('COMPLETED')).toEqual({ label: 'Terminée', variant: 'success' });
    expect(checklistStatus('CANCELLED')).toEqual({ label: 'Annulée', variant: 'danger' });
  });

  it("n'affiche jamais un code inconnu tel quel", () => {
    expect(checklistStatus('ARCHIVED').label).toBe('Statut inconnu');
    expect(checklistStatus(null).variant).toBe('neutral');
  });
});

describe('submissionProgress', () => {
  it('ne compte que les réponses cochées des items encore présents dans le modèle', () => {
    const template = { items: [item(1, 'EXTERIOR', 0), item(2, 'COCKPIT', 1), item(3, 'ENGINE', 2)] } as never;
    const responses = [
      { itemId: 1, checked: true },
      { itemId: '2', checked: false },
      { itemId: 99, checked: true },
    ];
    expect(submissionProgress({ template, responses })).toEqual({ checked: 1, total: 3, percentage: 33 });
  });

  it('vaut 0 % pour un modèle vide', () => {
    expect(submissionProgress({ template: { items: [] } as never, responses: [] })).toEqual({
      checked: 0,
      total: 0,
      percentage: 0,
    });
  });
});
