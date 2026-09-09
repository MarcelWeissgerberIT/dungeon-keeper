import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { translate, translateTree } from '../app/i18n';
import { ROOMS, NAMES } from '../app/game';
test('all room, creature, and room-description strings have English translations', () => {
  for (const { name, description } of Object.values(ROOMS)) {
    assert.notEqual(translate(name, 'en'), name);
    assert.notEqual(translate(description, 'en'), description);
  }
  for (const name of Object.values(NAMES))
    assert.notEqual(translate(name, 'en'), name);
});
test('dynamic combat, recruitment, payroll and HUD counters translate', () => {
  assert.equal(
    translate('Schürfling ist gefallen.', 'en'),
    'Delver has fallen.',
  );
  assert.equal(
    translate('Runenweber tritt durch das Tiefentor.', 'en'),
    'Rune Weaver arrives through the deep gate.',
  );
  assert.equal(
    translate('Aschewächter erreicht Stufe 3.', 'en'),
    'Ash Warden reached level 3.',
  );
  assert.equal(
    translate('Zahltag: 210 Gold an deine Bewohner.', 'en'),
    'Payday: 210 gold paid to your creatures.',
  );
  assert.equal(translate('Angriff 2 von 4', 'en'), 'Invasion 2 of 4');
  assert.equal(translate('4 Gegner', 'en'), '4 enemies');
});
test('translated React tree preserves callbacks, element keys and accessible labels', () => {
  const click = () => {};
  const original = createElement(
    'button',
    { key: 'save', onClick: click, 'aria-label': 'Reich speichern' },
    createElement('strong', null, 'Speichern'),
  );
  const translated = translateTree(original, 'en') as typeof original;
  assert.equal(translated.key, original.key);
  assert.equal(translated.props.onClick, click);
  assert.equal(translated.props['aria-label'], 'Save domain');
  assert.equal(
    ((translated.props as any).children as any).props.children,
    'Save',
  );
  assert.equal(translateTree(original, 'de'), original);
});
test('translating static sibling elements does not introduce React key warnings', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const original = createElement('section', null,
    createElement('h2', null, 'Speichern'),
    createElement('p', null, 'Dein Reich'),
    [createElement('button', { key: 'grab' }, 'Greifen')],
  );
  const errors: unknown[][] = [];
  const previous = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const markup = renderToStaticMarkup(translateTree(original, 'en'));
    assert.match(markup, /Save/);
    assert.match(markup, /Grab/);
    assert.equal(errors.length, 0);
  } finally { console.error = previous; }
});
