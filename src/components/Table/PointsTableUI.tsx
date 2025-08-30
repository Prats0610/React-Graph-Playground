import type { Point } from "../../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

type Props = {
  points: Point[];
  hoveredId: string | null;
  onRowHover: (id: string | null) => void;
  onEdit: (p: Point) => void;
  onDelete: (id: string) => void;
  newestPointId?: string | null;
};

/**
 * Pure presentational table — no redux here.
 */
export default function PointsTableUI({
  points,
  hoveredId,
  onRowHover,
  onEdit,
  onDelete,
  newestPointId,
}: Props) {
  return (
    <Table size="small" aria-label="points table">
      <TableHead>
        <TableRow>
          <TableCell>ID</TableCell>
          <TableCell align="right">X</TableCell>
          <TableCell align="right">Y</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((p) => (
          <TableRow
            key={p.id}
            onMouseEnter={() => onRowHover(p.id)}
            onMouseLeave={() => onRowHover(null)}
            selected={hoveredId === p.id}
            sx={{
              backgroundColor: p.id === newestPointId ? "#e8f5e8" : "inherit",
              "&:hover": {
                backgroundColor: p.id === newestPointId ? "#d4edda" : undefined,
              },
            }}
          >
            <TableCell>{p.id.slice(0, 6)}</TableCell>
            <TableCell align="right">{p.x}</TableCell>
            <TableCell align="right">{p.y}</TableCell>
            <TableCell align="right">
              <IconButton
                size="small"
                onClick={() => onEdit(p)}
                aria-label={`edit-${p.id}`}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(p.id)}
                aria-label={`delete-${p.id}`}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
