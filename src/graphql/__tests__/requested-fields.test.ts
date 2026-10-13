import { visit, type DocumentNode } from 'graphql';
import { GET_ALL_AUDITS } from '../audit';
import { GET_ARTICLES } from '../articles';
import { GET_USER_FLIGHT_PLANS } from '../flights';
import { GET_ALL_MAINTENANCES } from '../maintenance';

// Dotted paths of every field a document asks for, e.g. "audits.closed_by.last_name".
const requestedFields = (document: DocumentNode): string[] => {
  const path: string[] = [];
  const fields: string[] = [];

  visit(document, {
    Field: {
      enter(node) {
        path.push(node.name.value);
        fields.push(path.join('.'));
      },
      leave() {
        path.pop();
      },
    },
  });

  return fields;
};

// Screens read these fields from list queries: when one is not requested the
// value is silently missing (empty detail, hidden form field).
describe('fields the list queries must request', () => {
  it('audits: who closed the audit and when', () => {
    expect(requestedFields(GET_ALL_AUDITS)).toEqual(
      expect.arrayContaining([
        'audits.closed_date',
        'audits.closed_by.id',
        'audits.closed_by.first_name',
        'audits.closed_by.last_name',
      ]),
    );
  });

  it('articles: the attached documents', () => {
    expect(requestedFields(GET_ARTICLES)).toContain('articles.documents_url');
  });

  it('flight plans: the weather conditions edited from the list', () => {
    expect(requestedFields(GET_USER_FLIGHT_PLANS)).toContain('getFlightsByUser.weather_conditions');
  });

  it('maintenances: the first and last name of the technician', () => {
    expect(requestedFields(GET_ALL_MAINTENANCES)).toEqual(
      expect.arrayContaining([
        'getAllMaintenances.technician.first_name',
        'getAllMaintenances.technician.last_name',
      ]),
    );
  });
});
