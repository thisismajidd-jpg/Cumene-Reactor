// Pure reducer. Action types live in src/store/actions.js (re-exported below for
// convenience). The reducer's only job is shape transformation; nothing here
// touches the solver — that lives in the useSolver hook.

import { initialState } from './initialState.js';

export const ACTIONS = {
  SET_UNIT_SYSTEM:    'SET_UNIT_SYSTEM',
  SET_REACTION:       'SET_REACTION',
  SET_PRIMARY:        'SET_PRIMARY',
  ADD_SIDE:           'ADD_SIDE',
  REMOVE_SIDE_AT:     'REMOVE_SIDE_AT',
  SET_SIDE_AT:        'SET_SIDE_AT',
  SET_SPECIES:        'SET_SPECIES',
  SET_CONDITIONS:     'SET_CONDITIONS',
  SET_FEED:           'SET_FEED',
  SET_REACTOR:        'SET_REACTOR',
  SET_REACTOR_FIELD:  'SET_REACTOR_FIELD',
  SET_NON_ISO:        'SET_NON_ISO',
  SET_CONSTRAINTS:    'SET_CONSTRAINTS',
  SET_SOLVER_STATUS:  'SET_SOLVER_STATUS',
  SET_SOLVER_RESULT:  'SET_SOLVER_RESULT',
  LOAD_CASE:          'LOAD_CASE',
  RESET:              'RESET',
};

export function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_UNIT_SYSTEM:
      return { ...state, unitSystem: action.payload };

    case ACTIONS.SET_REACTION:
      return { ...state, reaction: { ...state.reaction, ...action.payload } };

    case ACTIONS.SET_PRIMARY:
      return {
        ...state,
        reaction: {
          ...state.reaction,
          primary: { ...state.reaction.primary, ...action.payload },
        },
      };

    case ACTIONS.ADD_SIDE: {
      // Append a new side reaction. Payload (optional) seeds the initial shape;
      // when omitted we fall back to a sensible blank template.
      const template = action.payload ?? {
        type: 'elementary',
        stoich: { A: -1, C: -1, D: 1 },
        k0: 1e5,
        Ea: 100_000,
        orders: [
          { species: 'A', alpha: 1 },
          { species: 'C', alpha: 1 },
        ],
        adsorption: [],
        dHrx: -50_000,
        desired: false,
      };
      return {
        ...state,
        reaction: {
          ...state.reaction,
          sides: [...(state.reaction.sides ?? []), template],
        },
      };
    }

    case ACTIONS.REMOVE_SIDE_AT: {
      const idx = action.payload;
      return {
        ...state,
        reaction: {
          ...state.reaction,
          sides: (state.reaction.sides ?? []).filter((_, i) => i !== idx),
        },
      };
    }

    case ACTIONS.SET_SIDE_AT: {
      const { index, patch } = action.payload;
      return {
        ...state,
        reaction: {
          ...state.reaction,
          sides: (state.reaction.sides ?? []).map((s, i) =>
            i === index ? { ...s, ...patch } : s,
          ),
        },
      };
    }

    case ACTIONS.SET_SPECIES:
      return {
        ...state,
        reaction: { ...state.reaction, species: action.payload },
      };

    case ACTIONS.SET_CONDITIONS:
      return { ...state, conditions: { ...state.conditions, ...action.payload } };

    case ACTIONS.SET_FEED:
      return {
        ...state,
        conditions: {
          ...state.conditions,
          feedFlow: { ...state.conditions.feedFlow, ...action.payload },
        },
      };

    case ACTIONS.SET_REACTOR:
      return { ...state, reactor: { ...state.reactor, ...action.payload } };

    case ACTIONS.SET_REACTOR_FIELD: {
      const { group, patch } = action.payload;
      return {
        ...state,
        reactor: {
          ...state.reactor,
          [group]: { ...state.reactor[group], ...patch },
        },
      };
    }

    case ACTIONS.SET_NON_ISO:
      return {
        ...state,
        reactor: {
          ...state.reactor,
          nonIso: { ...state.reactor.nonIso, ...action.payload },
        },
      };

    case ACTIONS.SET_CONSTRAINTS:
      return { ...state, constraints: { ...state.constraints, ...action.payload } };

    case ACTIONS.SET_SOLVER_STATUS:
      return { ...state, solver: { ...state.solver, status: action.payload } };

    case ACTIONS.SET_SOLVER_RESULT:
      return {
        ...state,
        solver: {
          ...state.solver,
          status: action.payload?.ok ? 'success' : 'error',
          result: action.payload,
          runId: state.solver.runId + 1,
        },
      };

    case ACTIONS.LOAD_CASE: {
      const { caseId, state: caseState } = action.payload;
      return {
        ...initialState,
        ...caseState,
        unitSystem: state.unitSystem,
        activeCaseId: caseId,
      };
    }

    case ACTIONS.RESET:
      return { ...initialState, unitSystem: state.unitSystem };

    default:
      return state;
  }
}
