import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { reducer } from './reducer.js';
import { initialState } from './initialState.js';

const ReactorContext = createContext(null);

export function ReactorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ReactorContext.Provider value={value}>{children}</ReactorContext.Provider>;
}

export function useReactorContext() {
  const ctx = useContext(ReactorContext);
  if (!ctx) {
    throw new Error('useReactorContext must be used inside <ReactorProvider>');
  }
  return ctx;
}
