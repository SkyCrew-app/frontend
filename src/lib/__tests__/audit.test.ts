import { filterAudits, getChangedAuditItems, isAuditOverdue, toAuditTemplateItemInput } from '../audit';

describe('toAuditTemplateItemInput', () => {
  it("retire l'id et le __typename d'un élément issu d'une requête", () => {
    const input = toAuditTemplateItemInput(
      {
        __typename: 'AuditTemplateItem',
        id: 12,
        category: 'MOTEUR',
        title: 'Niveau huile',
        description: 'Vérifier le niveau',
        criticality: 'MAJEUR',
      },
      0,
    );

    expect(input).toEqual({
      category: 'MOTEUR',
      title: 'Niveau huile',
      description: 'Vérifier le niveau',
      criticality: 'MAJEUR',
      order_index: 0,
    });
    expect(Object.keys(input)).not.toContain('id');
    expect(Object.keys(input)).not.toContain('__typename');
  });

  it('conserve tous les champs définis par CreateAuditTemplateItemInput', () => {
    const item = {
      category: 'CELLULE',
      title: 'Fuselage',
      description: 'Inspection visuelle',
      criticality: 'CRITIQUE',
      inspection_method: 'Visuelle',
      expected_result: 'Aucune fissure',
      reference_documentation: 'AMM 53-10',
      requires_photo_evidence: true,
      is_mandatory: false,
    };

    expect(toAuditTemplateItemInput(item, 3)).toEqual({ ...item, order_index: 3 });
  });

  it("utilise la position dans la liste comme order_index, même si l'élément en portait un autre", () => {
    const input = toAuditTemplateItemInput({ category: 'AUTRE', title: 'A', description: '', order_index: 9 }, 2);

    expect(input.order_index).toBe(2);
  });

  it('omet les champs optionnels nuls et garde les booléens à false', () => {
    const input = toAuditTemplateItemInput(
      {
        category: 'AUTRE',
        title: 'A',
        description: null,
        inspection_method: null,
        expected_result: undefined,
        requires_photo_evidence: false,
      },
      0,
    );

    expect(input).toEqual({
      category: 'AUTRE',
      title: 'A',
      description: '',
      order_index: 0,
      requires_photo_evidence: false,
    });
    expect(Object.keys(input)).not.toContain('inspection_method');
  });
});

describe('getChangedAuditItems', () => {
  const original = [
    { id: 1, category: 'MOTEUR', description: 'Huile', notes: null, result: 'CONFORME', requires_action: false },
    { id: 2, category: 'CELLULE', description: 'Fuselage', notes: 'RAS', result: 'CONFORME', requires_action: false },
  ];
  const asForm = (items: typeof original) => items.map((item) => ({ ...item, notes: item.notes || '' }));

  it("ne renvoie rien quand aucun élément n'a été modifié", () => {
    expect(getChangedAuditItems(original, asForm(original))).toEqual([]);
  });

  it('ne renvoie que les éléments modifiés, avec uniquement les champs modifiés', () => {
    const current = asForm(original);
    current[1] = { ...current[1], result: 'NON_CONFORME', requires_action: true };

    expect(getChangedAuditItems(original, current)).toEqual([
      { id: 2, input: { result: 'NON_CONFORME', requires_action: true } },
    ]);
  });

  it('détecte une note saisie sur un élément qui n’en avait pas', () => {
    const current = asForm(original);
    current[0] = { ...current[0], notes: 'Appoint effectué' };

    expect(getChangedAuditItems(original, current)).toEqual([{ id: 1, input: { notes: 'Appoint effectué' } }]);
  });

  it('détecte une note vidée', () => {
    const current = asForm(original);
    current[1] = { ...current[1], notes: '' };

    expect(getChangedAuditItems(original, current)).toEqual([{ id: 2, input: { notes: '' } }]);
  });

  it("ne considère pas comme modifié un requires_action absent à l'origine et resté décoché", () => {
    const withoutFlag = [{ id: 1, category: 'MOTEUR', description: 'Huile', notes: '', result: 'CONFORME' }];
    const current = [{ ...withoutFlag[0], requires_action: false, criticality: undefined }];

    expect(getChangedAuditItems(withoutFlag, current)).toEqual([]);
  });

  it("n'envoie jamais de champ étranger à UpdateAuditItemInput", () => {
    const current = asForm(original).map((item) => ({ ...item, criticality: 'MAJEUR', __typename: 'AuditItem' }));
    current[0].category = 'AVIONIQUE';

    expect(getChangedAuditItems(original, current)).toEqual([{ id: 1, input: { category: 'AVIONIQUE' } }]);
  });

  it("ignore un élément inconnu de l'audit d'origine", () => {
    const current = [...asForm(original), { id: 99, category: 'AUTRE', description: 'X', notes: '', result: 'CONFORME', requires_action: false }];

    expect(getChangedAuditItems(original, current)).toEqual([]);
    expect(getChangedAuditItems(undefined, current)).toEqual([]);
  });
});

describe('filterAudits', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const audits = [
    { id: 1, audit_frequency: 'ANNUEL', is_closed: false, next_audit_date: '2026-06-01T00:00:00Z' },
    { id: 2, audit_frequency: 'MENSUEL', is_closed: false, next_audit_date: '2026-07-01T00:00:00Z' },
    { id: 3, audit_frequency: 'ANNUEL', is_closed: true, next_audit_date: '2026-01-01T00:00:00Z' },
    { id: 4, audit_frequency: 'MENSUEL', is_closed: false, next_audit_date: null },
  ];
  const ids = (list: { id: number }[]) => list.map((audit) => audit.id);

  it('renvoie tous les audits sans filtre', () => {
    expect(ids(filterAudits(audits, {}, now))).toEqual([1, 2, 3, 4]);
    expect(ids(filterAudits(audits, { auditFrequency: null, overdueOnly: false }, now))).toEqual([1, 2, 3, 4]);
  });

  it('filtre sur la fréquence sélectionnée', () => {
    expect(ids(filterAudits(audits, { auditFrequency: 'ANNUEL' }, now))).toEqual([1, 3]);
  });

  it('ne garde en retard que les audits ouverts dont la prochaine date est passée', () => {
    expect(ids(filterAudits(audits, { overdueOnly: true }, now))).toEqual([1]);
  });

  it('combine fréquence et retard', () => {
    expect(ids(filterAudits(audits, { auditFrequency: 'MENSUEL', overdueOnly: true }, now))).toEqual([]);
    expect(ids(filterAudits(audits, { auditFrequency: 'ANNUEL', overdueOnly: true }, now))).toEqual([1]);
  });
});

describe('isAuditOverdue', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it("n'est pas en retard quand l'audit est clôturé", () => {
    expect(isAuditOverdue({ is_closed: true, next_audit_date: '2026-01-01T00:00:00Z' }, now)).toBe(false);
  });

  it("n'est pas en retard sans date de prochain audit", () => {
    expect(isAuditOverdue({ is_closed: false, next_audit_date: null }, now)).toBe(false);
  });

  it("n'est pas en retard quand la prochaine date est à venir", () => {
    expect(isAuditOverdue({ is_closed: false, next_audit_date: '2026-06-15T12:00:01Z' }, now)).toBe(false);
  });

  it('est en retard quand la prochaine date est passée', () => {
    expect(isAuditOverdue({ is_closed: false, next_audit_date: '2026-06-15T11:59:59Z' }, now)).toBe(true);
  });
});
