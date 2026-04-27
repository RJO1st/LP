/**
 * taraClassifier.test.js
 *
 * Tests for the child-safety intent classifier. This is a SAFETY-CRITICAL
 * module — regressions here have real-world consequences for children.
 *
 * Coverage target: every safeguarding pattern must have at least one plain-text
 * test AND one obfuscation/homoglyph test. Concerning patterns get at least one
 * test each. On-topic and innocent paths get representative tests.
 */

import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../taraClassifier.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const flag    = (text, topic, subject) =>
  expect(classifyIntent(text, topic, subject)).toBe('safeguarding_flag');
const concern = (text, topic, subject) =>
  expect(classifyIntent(text, topic, subject)).toBe('off_topic_concerning');
const innocent = (text, topic, subject) =>
  expect(classifyIntent(text, topic, subject)).toBe('off_topic_innocent');
const onTopic = (text, topic, subject) =>
  expect(classifyIntent(text, topic, subject)).toBe('on_topic');

// ─────────────────────────────────────────────────────────────────────────────
describe('classifyIntent — safeguarding_flag', () => {
  // Direct crisis statements
  it('kills self plaintext', () => flag('I want to kill myself'));
  it('KMS acronym',          () => flag('kms please help'));
  it('want to die',          () => flag('I just want to die'));
  it('end my life',          () => flag("I want to end my life"));
  it('suicide keyword',      () => flag('I am thinking about suicide'));
  it('self-harm',            () => flag("I keep self harming"));
  it('cutting myself',       () => flag("I have been cutting myself"));
  it('abuse disclosure',     () => flag('I am being abused at home'));
  it('touches me',           () => flag('My uncle touches me at night'));
  it('nobody cares',         () => flag('nobody cares about me anyway'));
  it('no reason to live',    () => flag('There is no reason to live'));
  it('run away from home',   () => flag("I want to run away from home"));

  // Homoglyph / spacing obfuscation — these must still trigger (#48 hardening)
  it('leetspeak kill myself (k1ll my53lf)',
    () => flag('k1ll my53lf'));
  it('spaced letters (k i l l m y s e l f)',
    () => flag('k i l l m y s e l f'));
  it('d3ath via suicid normalisation — "i want to die" with 3→e',
    () => flag('i w@nt to di3'));   // @→a, 3→e: "i want to die"
  it('s3lf h@rm obfuscation',
    () => flag('s3lf h@rm'));
  it('KMS with trailing punctuation',
    () => flag('kms!'));
  it('rape keyword',  () => flag('someone raped me'));
  it('molest keyword',() => flag('he molested me'));
});

// ─────────────────────────────────────────────────────────────────────────────
describe('classifyIntent — off_topic_concerning', () => {
  it('how to hack',         () => concern('how do I hack into someone'));
  it('drugs query',         () => concern('where can I get drugs'));
  it('alcohol query',       () => concern('how much alcohol can I drink'));
  it('porn keyword',        () => concern('show me some porn'));
  it('sex keyword',         () => concern('what is sex'));
  it('kill someone',        () => concern('I want to kill someone'));
  it('naked keyword',       () => concern('send me naked photos'));
  it('how to make weapon',  () => concern('how to make a bomb'));

  // Homoglyph obfuscation for concerning patterns
  it('p0rn with zero→o',    () => concern('show me p0rn'));
  it('s3x with 3→e',        () => concern('what is s3x'));
  it('dr ugs with space',   () => concern('dr ugs are bad right'));
});

// ─────────────────────────────────────────────────────────────────────────────
describe('classifyIntent — on_topic', () => {
  it('direct maths question',
    () => onTopic('What is 7 times 8?', 'multiplication', 'mathematics'));
  it('topic keyword present',
    () => onTopic('Can you help me with fractions?', 'fractions', 'mathematics'));
  it('subject keyword in text',
    () => onTopic('I am stuck on this science question', '', 'science'));
  it('short text with question mark is on_topic by default',
    () => onTopic('why?', '', ''));
  it('null / empty text returns on_topic',
    () => expect(classifyIntent(null, '', '')).toBe('on_topic'));
  it('algebra mentioned',
    () => onTopic('How does algebra work?', '', 'mathematics'));
  it('grammar question',
    () => onTopic('What is a subordinate clause?', '', 'english'));
  it('spelling question',
    () => onTopic('How do I spell "necessary"?', '', 'english'));
  it('WAEC topic — chemistry',
    () => onTopic('Help me with chemistry equations for WAEC', 'chemistry', 'science'));
});

// ─────────────────────────────────────────────────────────────────────────────
describe('classifyIntent — off_topic_innocent', () => {
  it('long off-topic statement without question mark',
    () => innocent('I am really bored today and want to go outside', '', ''));
  it('football chat',
    () => innocent('My favourite team won the match yesterday', '', ''));
  it('food comment',
    () => innocent('I had jollof rice for dinner last night', '', ''));
});

// ─────────────────────────────────────────────────────────────────────────────
describe('classifyIntent — priority order', () => {
  it('crisis pattern takes priority over concerning pattern in same message', () => {
    // Contains both "want to die" (crisis) and "drugs" (concerning)
    expect(classifyIntent('I want to die and drugs are the only comfort'))
      .toBe('safeguarding_flag');
  });

  it('concerning takes priority over innocent topic heuristic', () => {
    // Long string with drugs keyword — should not fall through to innocent
    expect(classifyIntent('Can you tell me where to get drugs near school'))
      .toBe('off_topic_concerning');
  });
});
