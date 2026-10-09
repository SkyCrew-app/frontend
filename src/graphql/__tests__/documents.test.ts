import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildSchema, validate, type DocumentNode } from 'graphql';

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

describe('GraphQL documents', () => {
  it('finds the documents of the application', () => {
    expect(documents.length).toBeGreaterThan(100);
  });

  it.each(documents)('$label matches the API schema', ({ document }) => {
    const problems = validate(schema, document).map((error) => error.message);

    expect(problems).toEqual([]);
  });
});
