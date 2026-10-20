import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  buildSchema,
  Kind,
  validate,
  type DocumentNode,
  type FragmentDefinitionNode,
  type SelectionSetNode,
} from 'graphql';

// Every query and mutation of the application is checked against the API
// schema, so a wrong field, argument or type name fails here instead of in
// front of a user. The schema file is refreshed with `npm run schema:pull`.
const graphqlDirectory = join(__dirname, '..');
const schema = buildSchema(
  readFileSync(join(graphqlDirectory, 'schema.graphql'), 'utf8'),
);

const isDocument = (value: unknown): value is DocumentNode =>
  typeof value === 'object' &&
  value !== null &&
  (value as { kind?: string }).kind === 'Document';

const documents = readdirSync(graphqlDirectory)
  .filter((file) => file.endsWith('.ts'))
  .flatMap((file) =>
    Object.entries(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require(join(graphqlDirectory, file)) as Record<string, unknown>,
    )
      .filter(([, value]) => isDocument(value))
      .map(([name, value]) => ({
        label: `${file} ${name}`,
        document: value as DocumentNode,
      })),
  );

// The API refuses larger operations before running them
// (backend/src/common/graphql/query-limits.rule.ts, DEFAULT_QUERY_LIMITS).
const API_MAX_FIELDS = 500;
const API_MAX_DEPTH = 10;

// Fields and depth of each operation as the API receives it: fragments
// expanded, __typename included.
const sizeOf = (document: DocumentNode) => {
  const fragments = new Map<string, FragmentDefinitionNode>(
    document.definitions
      .filter(
        (definition): definition is FragmentDefinitionNode =>
          definition.kind === Kind.FRAGMENT_DEFINITION,
      )
      .map((definition) => [definition.name.value, definition]),
  );
  let fields = 0;
  let depth = 0;
  const walk = (set: SelectionSetNode | undefined, level: number) => {
    for (const selection of set?.selections ?? []) {
      if (selection.kind === Kind.FIELD) {
        fields += 1;
        depth = Math.max(depth, level + 1);
        // Apollo Client adds __typename to every object it asks for.
        if (
          selection.selectionSet &&
          !selection.selectionSet.selections.some(
            (child) =>
              child.kind === Kind.FIELD && child.name.value === '__typename',
          )
        )
          fields += 1;
        walk(selection.selectionSet, level + 1);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        walk(selection.selectionSet, level);
      } else {
        walk(fragments.get(selection.name.value)?.selectionSet, level);
      }
    }
  };
  const operations = document.definitions.filter(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  );
  return operations.map((operation) => {
    fields = 0;
    depth = 0;
    walk(operation.selectionSet, 0);
    return { fields, depth };
  });
};

describe('GraphQL documents', () => {
  it('finds the documents of the application', () => {
    expect(documents.length).toBeGreaterThan(100);
  });

  it.each(documents)('$label matches the API schema', ({ document }) => {
    const problems = validate(schema, document).map((error) => error.message);

    expect(problems).toEqual([]);
  });

  it.each(documents)(
    '$label stays within the size the API accepts',
    ({ document }) => {
      for (const { fields, depth } of sizeOf(document)) {
        expect(fields).toBeLessThanOrEqual(API_MAX_FIELDS);
        expect(depth).toBeLessThanOrEqual(API_MAX_DEPTH);
      }
    },
  );

  it('measures the largest operation (the flight plan result)', () => {
    const sizes = documents.flatMap(({ label, document }) =>
      sizeOf(document).map((size) => ({ label, ...size })),
    );
    const largest = sizes.reduce((a, b) => (b.fields > a.fields ? b : a));
    expect(largest.label).toMatch(/navplan/);
    expect(largest.fields).toBeGreaterThan(300);
  });
});
