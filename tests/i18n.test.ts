import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ReactElement } from 'react';
import { translate, translateTree } from '../app/i18n';
import { ROOMS, NAMES } from '../app/game';
void test('all room, creature, and room-description strings have English translations', () => {
  for (const { name, description } of Object.values(ROOMS)) {
    assert.notEqual(translate(name, 'en'), name);
    assert.notEqual(translate(description, 'en'), description);
  }
  for (const name of Object.values(NAMES))
    assert.notEqual(translate(name, 'en'), name);
});
void test('dynamic combat, recruitment, payroll and HUD counters translate', () => {
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
void test('tool shortcuts, creature work, construction and audio controls are English', () => {
  const cases = {
    Sättigung: 'Fullness',
    'Auswählen (1)': 'Select (1)',
    'Graben (2)': 'Excavate (2)',
    'Verkaufen (3)': 'Sell (3)',
    'Sammelbanner (4)': 'Rally banner (4)',
    'Glutsegen (5)': 'Ember blessing (5)',
    'Errichtet Raum': 'Constructing room',
    'Wartet auf Baugold': 'Waiting for building gold',
    'In der Hand': 'In your hand',
    'Geplant: Übungshof': 'Planned: Training yard',
    'Aufträge löschen: Runenarchiv': 'Remove orders: Rune archive',
    'Schürfling · 4': 'Delver · 4',
    'Musik: stumm – klicken zum Umschalten': 'Music: muted – click to toggle',
    'Geräusche: 75% – klicken zum Umschalten':
      'Sound effects: 75% – click to toggle',
    'Auf Deutsch umschalten': 'Switch to German',
    Schließen: 'Close',
  };
  for (const [source, expected] of Object.entries(cases)) {
    assert.equal(translate(source, 'en'), expected, source);
    assert.equal(translate(source, 'de'), source);
  }
});
void test('stored German events can switch language without changing the saved messages', () => {
  const events = [
    'Runenweber tritt durch das Tiefentor.',
    'Angriff 3/4: Sonnenritter dringen in dein Reich ein.',
    'Zahltag: 340 Gold an deine Bewohner.',
  ];
  const tree = createElement(
    'ul',
    null,
    events.map((event, i) => createElement('li', { key: i }, event)),
  );
  const english = translateTree(tree, 'en') as ReactElement<{
    children: ReactElement<{ children: string }>[];
  }>;
  assert.deepEqual(
    english.props.children.map((child) => child.props.children),
    [
      'Rune Weaver arrives through the deep gate.',
      'Invasion 3/4: Sun Knights enter your domain.',
      'Payday: 340 gold paid to your creatures.',
    ],
  );
  assert.equal(translateTree(tree, 'de'), tree);
  assert.equal(events[0], 'Runenweber tritt durch das Tiefentor.');
});
void test('translated React tree preserves callbacks, element keys and accessible labels', () => {
  const click = () => {};
  const original = createElement(
    'button',
    {
      key: 'save',
      onClick: click,
      'aria-label': 'Reich speichern',
    },
    createElement('strong', null, 'Speichern'),
  );
  const translated = translateTree(original, 'en') as ReactElement<
    typeof original.props & { children: ReactElement<{ children: string }> }
  >;
  assert.equal(translated.key, original.key);
  assert.equal(translated.props.onClick, click);
  assert.equal(translated.props['aria-label'], 'Save domain');
  assert.equal(translated.props.children.props.children, 'Save');
  assert.equal(translateTree(original, 'de'), original);
});
void test('translating static sibling elements does not introduce React key warnings', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const original = createElement(
    'section',
    null,
    createElement('h2', null, 'Speichern'),
    createElement('p', null, 'Dein Reich'),
    [createElement('button', { key: 'grab' }, 'Greifen')],
  );
  const errors: unknown[][] = [];
  const previous = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };
  try {
    const markup = renderToStaticMarkup(translateTree(original, 'en'));
    assert.match(markup, /Save/);
    assert.match(markup, /Grab/);
    assert.equal(errors.length, 0);
  } finally {
    console.error = previous;
  }
});
