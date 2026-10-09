// Refreshes src/graphql/schema.graphql from a running backend.
// The documents test validates every query and mutation against that file,
// so run this whenever the API changes:
//
//   npm run schema:pull
//   SCHEMA_URL=https://api.example.com/graphql npm run schema:pull
import { writeFileSync } from 'node:fs';
import {
  buildClientSchema,
  getIntrospectionQuery,
  lexicographicSortSchema,
  printSchema,
} from 'graphql';

const url = process.env.SCHEMA_URL || 'http://localhost:3000/graphql';

const response = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: getIntrospectionQuery() }),
});

if (!response.ok) {
  throw new Error(`${url} answered ${response.status}`);
}

const { data, errors } = await response.json();

if (errors?.length) {
  throw new Error(errors.map((error) => error.message).join('; '));
}

const schema = lexicographicSortSchema(buildClientSchema(data));
const target = new URL('../src/graphql/schema.graphql', import.meta.url);

writeFileSync(target, `${printSchema(schema)}\n`);
console.log(`Schema written from ${url}`);
