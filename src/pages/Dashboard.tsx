// Dashboard.tsx - Enhanced version
import PointsGraph from "../components/Graph/PointsGraph";
import PointsTableContainer from "../components/Table/PointsTableContainer";

export default function Dashboard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        padding: "20px",
        gap: "20px",
        boxSizing: "border-box",
      }}
    >
      {/* Graph Section - Takes up top portion */}
      <div
        style={{
          flex: "1",
          minHeight: "500px", // Increased minimum height
          width: "100%",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          overflow: "hidden", // Prevent content overflow
        }}
      >
        <PointsGraph />
      </div>

      {/* Table Section */}
      <div
        style={{
          flexShrink: 0,
          maxHeight: "400px",
          width: "100%",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          overflow: "auto",
        }}
      >
        <PointsTableContainer />
      </div>
    </div>
  );
}
