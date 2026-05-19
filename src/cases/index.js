import cumene from './cumene.js';
import ethyleneOxide from './ethyleneOxide.js';
import maleicAnhydride from './maleicAnhydride.js';
import autocatalytic from './autocatalytic.js';

export const CASES = [cumene, ethyleneOxide, maleicAnhydride, autocatalytic];

export const getCase = (id) => CASES.find((c) => c.id === id);
