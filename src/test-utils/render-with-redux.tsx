import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import pointsReducer from "../store/pointsSlice";

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      points: pointsReducer,
    },
    preloadedState,
  });
};

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  preloadedState?: any;
  store?: ReturnType<typeof createTestStore>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
