/**
 * @jest-environment node
 */
import { sanitizeRichText } from '../sanitize-html';

describe('sanitizeRichText on the server', () => {
  it('rend une chaîne vide plutôt que le texte non filtré', () => {
    expect(typeof window).toBe('undefined');
    expect(sanitizeRichText('<p>a</p><script>alert(1)</script>')).toBe('');
  });
});
