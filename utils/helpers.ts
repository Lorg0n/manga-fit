import { finder } from '@medv/finder';

export function generateSmartPattern(urlStr: string): string {
  const url = new URL(urlStr);
  let fullPath = url.hostname + url.pathname + url.search;
  return fullPath.replace(/\d+/g, '*');
}

export function doesUrlMatch(urlStr: string, pattern: string): boolean {
  const url = new URL(urlStr);
  const fullPath = url.hostname + url.pathname + url.search;
  
  const escapeRegex = (s: string) => s.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexStr = pattern.split('*').map(escapeRegex).join('.*');
  
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(fullPath);
}

function getClosestCommonAncestor(elements: HTMLElement[]): HTMLElement {
  if (elements.length === 0) return document.body;
  if (elements.length === 1) return elements[0].parentElement || document.body;

  let ancestor: HTMLElement | null = elements[0].parentElement;

  while (ancestor) {
    const currentAncestor = ancestor;
    const containsAll = elements.every(el => currentAncestor.contains(el));
    if (containsAll) {
      return currentAncestor;
    }
    ancestor = ancestor.parentElement;
  }
  return document.body;
}

export function generateGenericSelector(elements: HTMLElement[]): string {
  if (elements.length === 0) return '';

  if (elements.length === 1) {
    let sel = finder(elements[0]);
    sel = sel.replace(/:nth-child\([^)]+\)/g, '');
    sel = sel.replace(/:nth-of-type\([^)]+\)/g, '');
    return sel;
  }

  const ancestor = getClosestCommonAncestor(elements);
  const ancestorSelector = finder(ancestor);
  
  const areAllDirectChildren = elements.every(el => el.parentElement === ancestor);
  if (areAllDirectChildren) {
    return `${ancestorSelector} > img`;
  }
  
  return `${ancestorSelector} img`;
}