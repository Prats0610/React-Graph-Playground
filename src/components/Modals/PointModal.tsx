import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface PointModalProps {
  open: boolean;
  initial?: { x: number; y: number };
  onClose: () => void;
  onSave: (x: number, y: number) => void;
}

/**
 * Reusable Popup Modal for Adding or Editing a point.
 * - mode="edit" → Edit Point
 */
export default function PointModal({
  open,
  initial,
  onClose,
  onSave,
}: PointModalProps) {
  const [x, setX] = useState(initial?.x ?? 0);
  const [y, setY] = useState(initial?.y ?? 0);

  // Reset when modal opens with new initial values
  useEffect(() => {
    if (initial) {
      setX(initial.x);
      setY(initial.y);
    } else {
      setX(0);
      setY(0);
    }
  }, [initial, open]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Point</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        <TextField
          label="X Value"
          type="number"
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
          fullWidth
        />
        <TextField
          label="Y Value"
          type="number"
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onSave(x, y)}
          variant="contained"
          color="primary"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
