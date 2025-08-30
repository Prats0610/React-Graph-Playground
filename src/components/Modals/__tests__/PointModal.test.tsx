import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PointModal from "../PointModal";

describe("PointModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when open is true", () => {
    render(
      <PointModal open={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(screen.getByText("Edit Point")).toBeInTheDocument();
    expect(screen.getByLabelText(/x/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/y/i)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <PointModal open={false} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(screen.queryByText("Edit Point")).not.toBeInTheDocument();
  });

  it("calls onSave with correct values when Save button is clicked", async () => {
    render(
      <PointModal
        open={true}
        initial={{ x: 10, y: 20 }}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(10, 20);
    });
  });

  it("calls onClose when Cancel button is clicked", () => {
    render(
      <PointModal open={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("updates input values correctly", () => {
    render(
      <PointModal
        open={true}
        initial={{ x: 5, y: 15 }}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const xInput = screen.getByLabelText(/x/i) as HTMLInputElement;
    const yInput = screen.getByLabelText(/y/i) as HTMLInputElement;

    expect(xInput.value).toBe("5");
    expect(yInput.value).toBe("15");

    fireEvent.change(xInput, { target: { value: "25" } });
    fireEvent.change(yInput, { target: { value: "35" } });

    expect(xInput.value).toBe("25");
    expect(yInput.value).toBe("35");
  });
});
