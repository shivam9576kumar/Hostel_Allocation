import DOMPurify from 'dompurify';

// React escapes by default, but if you MUST use dangerouslySetInnerHTML for rich text
export const sanitizeHTML = (html) => {
  return {
    __html: DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
    })
  };
};

// Sanitize user input for display in UI to prevent XSS
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  const element = document.createElement('div');
  element.textContent = text;
  return element.innerHTML;
};
