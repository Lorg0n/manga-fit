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

/**
 * Priority-based parent climbing to locate structural layout cells.
 * If the closest matched wrapper is a grid thumbnail link (<a>), the algorithm
 * climbs to its parent block container (like a <div> or <li>) to resize
 * the actual column block. If it's a simple navigation link on a reader page,
 * it bypasses it and returns the <img> tag directly.
 */
function findGenericParent(el: HTMLElement): HTMLElement {
  if (el.tagName !== 'IMG') return el;

  // 1. High-priority class wrappers (grid cells, thumbnail wrappers, panel divs)
  let container = el.closest('[class*="thumb"], [class*="card"], [class*="item"], [class*="panel"]');
  
  // If the matched container is a link (<a>), climb to the structural block wrapping it
  if (container && container.tagName === 'A') {
    const parent = container.parentElement;
    if (parent && parent !== document.body && ['DIV', 'LI', 'FIGURE'].includes(parent.tagName)) {
      container = parent;
    }
  }

  if (container && container !== document.body) {
    return container as HTMLElement;
  }

  // 2. Medium-priority elements (sequential figures, picture elements, list items)
  const elementWrapper = el.closest('figure, picture, li');
  if (elementWrapper && elementWrapper !== document.body) {
    return elementWrapper as HTMLElement;
  }

  // 3. Fallback: Direct parent node
  const parent = el.parentElement;
  if (parent && parent.tagName === 'A') {
    // If the immediate parent is a simple navigation link (with no layout classes),
    // bypass it and return the image element itself. This preserves direct scaling on comic reader pages.
    return el;
  }

  if (parent && parent !== document.body && parent !== document.documentElement) {
    return parent;
  }

  return el;
}

export function generateGenericSelector(elements: HTMLElement[]): string {
  if (elements.length === 0) return '';

  // Map elements to their designated structural layout wrappers
  const targets = elements.map(findGenericParent);

  if (targets.length === 1) {
    let sel = finder(targets[0]);
    sel = sel.replace(/:nth-child\([^)]+\)/g, '');
    sel = sel.replace(/:nth-of-type\([^)]+\)/g, '');
    return sel;
  }

  const ancestor = getClosestCommonAncestor(targets);
  const ancestorSelector = finder(ancestor);
  
  const targetTagName = targets[0].tagName.toLowerCase();
  const areAllDirectChildren = targets.every(el => el.parentElement === ancestor);
  if (areAllDirectChildren) {
    return `${ancestorSelector} > ${targetTagName}`;
  }
  
  return `${ancestorSelector} ${targetTagName}`;
}