// Sugar over the reactor context — gives components a small, opinionated API.
//
//   const { state, set, reset, loadCase, dispatch } = useReactor();
//   set.conditions({ T_inlet: 640 });
//   set.reactor({ type: 'PBR' });
//   set.unitSystem('si');

import { useMemo } from 'react';
import { useReactorContext } from '../store/reactorContext.jsx';
import { ACTIONS } from '../store/reducer.js';

export function useReactor() {
  const { state, dispatch } = useReactorContext();

  const api = useMemo(() => {
    return {
      set: {
        unitSystem: (value) => dispatch({ type: ACTIONS.SET_UNIT_SYSTEM, payload: value }),
        reaction: (patch) => dispatch({ type: ACTIONS.SET_REACTION, payload: patch }),
        primary: (patch) => dispatch({ type: ACTIONS.SET_PRIMARY, payload: patch }),
        side: (patch) => dispatch({ type: ACTIONS.SET_SIDE, payload: patch }),
        toggleSide: (enabled) => dispatch({ type: ACTIONS.TOGGLE_SIDE, payload: enabled }),
        species: (list) => dispatch({ type: ACTIONS.SET_SPECIES, payload: list }),
        conditions: (patch) => dispatch({ type: ACTIONS.SET_CONDITIONS, payload: patch }),
        feed: (patch) => dispatch({ type: ACTIONS.SET_FEED, payload: patch }),
        reactor: (patch) => dispatch({ type: ACTIONS.SET_REACTOR, payload: patch }),
        reactorField: (group, patch) =>
          dispatch({ type: ACTIONS.SET_REACTOR_FIELD, payload: { group, patch } }),
        nonIso: (patch) => dispatch({ type: ACTIONS.SET_NON_ISO, payload: patch }),
        constraints: (patch) => dispatch({ type: ACTIONS.SET_CONSTRAINTS, payload: patch }),
        solverStatus: (status) => dispatch({ type: ACTIONS.SET_SOLVER_STATUS, payload: status }),
        solverResult: (result) => dispatch({ type: ACTIONS.SET_SOLVER_RESULT, payload: result }),
      },
      loadCase: (caseId, caseState) =>
        dispatch({ type: ACTIONS.LOAD_CASE, payload: { caseId, state: caseState } }),
      reset: () => dispatch({ type: ACTIONS.RESET }),
      dispatch,
    };
  }, [dispatch]);

  return { state, ...api };
}
