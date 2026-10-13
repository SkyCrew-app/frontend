import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RichText } from '../rich-text';

describe('RichText', () => {
  it('affiche la mise en forme et retire ce qui s’exécute', () => {
    const { container } = render(
      <RichText
        className="prose"
        html={
          '<h2>Titre</h2><p onclick="alert(1)">Un <strong>texte</strong></p>' +
          '<img src="x" onerror="alert(1)"><script>alert(1)</script>' +
          '<a href="javascript:alert(1)">piège</a>'
        }
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('prose');
    expect(root.querySelector('h2')).toHaveTextContent('Titre');
    expect(root.querySelector('strong')).toHaveTextContent('texte');
    expect(root.querySelector('script')).toBeNull();
    expect(root.querySelector('[onclick]')).toBeNull();
    expect(root.querySelector('[onerror]')).toBeNull();
    expect(root.querySelector('a')).not.toHaveAttribute('href');
  });

  it('suit le texte quand il change', () => {
    const { container, rerender } = render(<RichText html="<p>Un</p>" />);
    expect(container).toHaveTextContent('Un');

    rerender(<RichText html="<p>Deux</p><script>alert(1)</script>" />);
    expect(container).toHaveTextContent('Deux');
    expect(container.querySelector('script')).toBeNull();

    rerender(<RichText html={null} />);
    expect(container.firstElementChild).toBeEmptyDOMElement();
  });
});
