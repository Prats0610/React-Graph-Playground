import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Point } from "../types";
type PointsState = {
  points: Point[];
  hoveredId: string | null;
};

const initialState: PointsState = {
  points: [], // for sample
  hoveredId: null,
};

const pointsSlice = createSlice({
  name: "points",
  initialState,
  reducers: {
    // Add a new point to store
    addPoint(state, action: PayloadAction<Point>) {
      state.points.push(action.payload);
    },
    // Update existing point by id
    updatePoint(state, action: PayloadAction<Point>) {
      const idx = state.points.findIndex((p) => p.id === action.payload.id);
      if (idx !== -1) state.points[idx] = action.payload;
    },
    // Delete point
    removePoint(state, action: PayloadAction<string>) {
      state.points = state.points.filter((p) => p.id !== action.payload);
    },
    // Set currently hovered point
    setHovered(state, action: PayloadAction<string | null>) {
      state.hoveredId = action.payload;
    },
    // Replace all points
    setPoints(state, action: PayloadAction<Point[]>) {
      state.points = action.payload;
    },
  },
});

export const { addPoint, updatePoint, removePoint, setHovered, setPoints } =
  pointsSlice.actions;
export default pointsSlice.reducer;
