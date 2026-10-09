import content from './content.json';
export function hint(key: keyof typeof content.tips) {
  const text = content.tips[key];
  return { 'data-tooltip': text, 'aria-description': text };
}
