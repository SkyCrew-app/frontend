import { escapeHtml, safeCssValue, sanitizeRichText } from '../sanitize-html';

describe('sanitizeRichText', () => {
  it.each([
    '<h1>Titre</h1><h2>Sous-titre</h2><h3>Section</h3>',
    '<p>Un <strong>texte</strong> <em>mis</em> <u>en</u> <s>forme</s></p>',
    '<ul><li><p>un</p></li><li><p>deux</p></li></ul>',
    '<ol start="3"><li><p>trois</p></li></ol>',
    '<blockquote><p>Citation</p></blockquote>',
    '<pre><code class="language-ts">const a = 1;</code></pre>',
    '<p>ligne<br>suivante</p><hr>',
    '<p><span style="font-size: 18px">Grand</span></p>',
    '<p><span style="color: rgb(255, 0, 0)">Rouge</span> <span style="color: #ff0000">rouge</span></p>',
    '<img src="https://exemple.fr/photo.jpg" alt="Image" class="rounded-md max-w-full h-auto my-4">',
    '<img src="/uploads/tmp/photo.jpg" alt="Image">',
  ])('garde ce que produisent les éditeurs : %s', (html) => {
    expect(sanitizeRichText(html)).toBe(html);
  });

  const link = (html: string) => {
    const holder = document.createElement('div');
    holder.innerHTML = sanitizeRichText(html);
    return holder.querySelector('a');
  };

  it('garde les liens http, https et mailto, sans accès à la page d’origine', () => {
    const external = link(
      '<a target="_blank" rel="noopener noreferrer nofollow" class="text-info underline cursor-pointer" href="https://exemple.fr/page?a=1">lien</a>',
    );
    expect(external?.getAttribute('href')).toBe('https://exemple.fr/page?a=1');
    expect(external?.getAttribute('target')).toBe('_blank');
    expect(external?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(external?.getAttribute('class')).toBe('text-info underline cursor-pointer');

    expect(link('<a href="http://exemple.fr">a</a>')?.getAttribute('href')).toBe('http://exemple.fr');
    expect(link('<a href="mailto:club@exemple.fr">a</a>')?.getAttribute('href')).toBe('mailto:club@exemple.fr');
  });

  it('impose rel et refuse les autres cibles', () => {
    const forged = link('<a href="https://exemple.fr" target="_top" rel="opener">a</a>');

    expect(forged?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(forged?.hasAttribute('target')).toBe(false);
  });

  it.each([
    ['un script', '<p>a</p><script>alert(1)</script>', '<p>a</p>'],
    ['une feuille de style', '<style>p{display:none}</style><p>a</p>', '<p>a</p>'],
    ['un gestionnaire d’événement', '<p onclick="alert(1)">a</p>', '<p>a</p>'],
    [
      'un gestionnaire d’erreur d’image',
      '<img src="https://exemple.fr/a.png" onerror="alert(1)">',
      '<img src="https://exemple.fr/a.png">',
    ],
    ['un cadre', '<iframe src="https://exemple.fr"></iframe><p>a</p>', '<p>a</p>'],
    ['un formulaire', '<form action="https://exemple.fr"><input name="p"><button>ok</button></form>', 'ok'],
    ['un svg piégé', '<svg onload="alert(1)"><circle /></svg><p>a</p>', '<p>a</p>'],
    ['un attribut data ou aria', '<p data-x="1" aria-label="x" id="a" title="t">a</p>', '<p>a</p>'],
    [
      'une classe quelconque',
      '<p class="fixed inset-0">a</p><span class="fixed">b</span>',
      '<p>a</p><span>b</span>',
    ],
    [
      'un style quelconque',
      '<span style="position:fixed;background:url(https://exemple.fr/x);font-size:18px">a</span><p style="color:#fff">b</p>',
      '<span style="font-size: 18px">a</span><p>b</p>',
    ],
    [
      'une valeur de style qui n’est ni une couleur ni une taille',
      '<span style="color:expression(alert(1));font-size:calc(1px + 100vw)">a</span>',
      '<span>a</span>',
    ],
  ])('retire %s', (_label, html, expected) => {
    expect(sanitizeRichText(html)).toBe(expected);
  });

  it('ne garde d’une liste de classes que celles des éditeurs', () => {
    expect(link('<a class="fixed text-info inset-0" href="https://exemple.fr">b</a>')?.getAttribute('class')).toBe(
      'text-info',
    );
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    '&#106;avascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'tel:+33102030405',
    '//exemple.fr/page',
  ])('retire la cible de lien %s', (href) => {
    const cleaned = link(`<a href="${href}">lien</a>`);

    expect(cleaned?.hasAttribute('href')).toBe(false);
    expect(cleaned?.textContent).toBe('lien');
  });

  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,<svg onload=alert(1)>',
    'data:image/png;base64,AAAA',
    'mailto:club@exemple.fr',
    '//exemple.fr/a.png',
  ])('retire la source d’image %s', (src) => {
    expect(sanitizeRichText(`<img src="${src}" alt="x">`)).toBe('<img alt="x">');
  });

  it('laisse le texte simple tel quel et vaut une chaîne vide sans texte', () => {
    expect(sanitizeRichText('2 &lt; 3 &amp; 4 &gt; 1')).toBe('2 &lt; 3 &amp; 4 &gt; 1');
    expect(sanitizeRichText('')).toBe('');
    expect(sanitizeRichText(null)).toBe('');
    expect(sanitizeRichText(undefined)).toBe('');
  });
});

describe('safeCssValue', () => {
  it.each(['#2563eb', 'hsl(var(--chart-1))', 'rgb(0 0 0 / 50%)', 'var(--color-brand)', 'red'])(
    'garde la couleur %s',
    (value) => {
      expect(safeCssValue(value)).toBe(value);
    },
  );

  it.each(['red; } body { display: none', 'red</style><script>alert(1)</script>', 'url("https://exemple.fr")', '', null, undefined])(
    'refuse %p',
    (value) => {
      expect(safeCssValue(value)).toBeNull();
    },
  );
});

describe('escapeHtml', () => {
  it('rend le texte inoffensif dans du HTML', () => {
    expect(escapeHtml(`<img src=x onerror="alert('1')"> & co`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt; &amp; co',
    );
    expect(escapeHtml('LFPG')).toBe('LFPG');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(1500)).toBe('1500');
  });
});
