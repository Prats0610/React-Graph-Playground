import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import PointsTableUI from "./PointsTableUI";
import type { RootState } from "../../store";
import {
  setHovered,
  removePoint,
  addPoint,
  updatePoint,
} from "../../store/pointsSlice";
import type { Point } from "../../types";
import PointModal from "../Modals/PointModal";

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
  const [newestPointId, setNewestPointId] = useState<string | null>(null);

  // Show notification when points are added
  useEffect(() => {
    if (points.length > 0) {
      const newestPoint = points[points.length - 1];
      setNewestPointId(newestPoint.id);

      const timer = setTimeout(() => {
        setNewestPointId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [points.length]);

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-lg">Points Table</h2>
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
        newestPointId={newestPointId}
      />
      {/* Reusable Popup Modal */}
      <PointModal
        open={!!editing}
        initial={editing ? { x: editing.x, y: editing.y } : undefined}
        onClose={() => setEditing(null)}
        onSave={(x, y) => {
          if (!editing) return;
          dispatch(updatePoint({ id: editing.id, x, y }));
          setEditing(null);
        }}
      />
    </>
  );
}
