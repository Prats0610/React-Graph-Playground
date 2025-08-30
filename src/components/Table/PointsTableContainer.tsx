import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import PointsTableUI from "./PointsTableUI";
import type { RootState } from "../../store";
import { setHovered, removePoint } from "../../store/pointsSlice";
import type { Point } from "../../types";

/**
 * Container connects UI to Redux.
 * - Dispatches Redux actions
 */
export default function PointsTableContainer() {
  const points = useSelector((s: RootState) => s.points.points);
  const hoveredId = useSelector((s: RootState) => s.points.hoveredId);
  const dispatch = useDispatch();

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Point | null>(null);

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-lg">Points Table</h2>
        <button
          onClick={() => {
            setModalMode("add");
            setEditing(null);
          }}
          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + Add Point
        </button>
      </div>

      <PointsTableUI
        points={points}
        hoveredId={hoveredId}
        onRowHover={(id) => dispatch(setHovered(id))}
        onEdit={(point) => {
          setEditing(point);
          setModalMode("edit");
        }}
        onDelete={(id) => dispatch(removePoint(id))}
      />
    </>
  );
}
