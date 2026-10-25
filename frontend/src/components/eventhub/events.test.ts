import { describe, expect, it } from 'vitest';
import { allEvents, filterEvents } from './events';
describe('EventHub sample event filtering', () => {
 it('searches event titles without case sensitivity', () => { expect(filterEvents(allEvents, 'RESUME', null).map(e => e.id)).toEqual(['resume']); });
 it('matches all query words across venue and event details', () => { expect(filterEvents(allEvents, 'startup innovation', null).map(e => e.id)).toEqual(['startup']); });
 it('combines category selection and search', () => { expect(filterEvents(allEvents, 'football', 'Sports')).toHaveLength(1); expect(filterEvents(allEvents, 'football', 'Cultural')).toHaveLength(0); });
 it('handles whitespace and categories without sample events', () => { expect(filterEvents(allEvents, '   ', null)).toHaveLength(5); expect(filterEvents(allEvents, '', 'Arts')).toHaveLength(0); });
});
