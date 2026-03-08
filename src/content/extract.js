import Defuddle from 'defuddle';

export function extractContent(htmlString, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Set the base URL so relative links resolve correctly
  const base = doc.createElement('base');
  base.href = url;
  doc.head.prepend(base);

  const defuddle = new Defuddle(doc);
  const result = defuddle.parse();

  return {
    title: result.title || '',
    content: result.content || '',
    author: result.author || '',
    siteName: result.site || '',
    favicon: result.favicon || '',
  };
}
