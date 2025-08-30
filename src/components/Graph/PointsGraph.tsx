import { useRef, useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import * as d3 from "d3";
import type { RootState } from "../../store";
import { addPoint, updatePoint, setHovered } from "../../store/pointsSlice";

interface Point {
  id: string;
  x: number;
  y: number;
}

export default function PointsGraph() {
  const points = useSelector((s: RootState) => s.points.points);
  const hoveredId = useSelector((s: RootState) => s.points.hoveredId);
  const dispatch = useDispatch();

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Store zoom transform state and drag states
  const [currentTransform, setCurrentTransform] = useState(d3.zoomIdentity);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const [currentDragCoords, setCurrentDragCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Chart margins
  const margin = { top: 50, right: 30, bottom: 60, left: 60 };

  // Resize observer to handle container size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({
          width: Math.max(400, width - 20),
          height: Math.max(300, height - 20),
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate inner dimensions
  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;

  // Get smart domain that adapts to points and zoom
  const getSmartDomain = useCallback(() => {
    if (points.length === 0) {
      return {
        x: [-10, 10] as [number, number],
        y: [-10, 10] as [number, number],
      };
    }

    const xExtent = d3.extent(points, (d: Point) => d.x) as [number, number];
    const yExtent = d3.extent(points, (d: Point) => d.y) as [number, number];

    // Add padding around points
    const xRange = xExtent[1] - xExtent[0];
    const yRange = yExtent[1] - yExtent[0];
    const xPadding = Math.max(2, xRange * 0.1);
    const yPadding = Math.max(2, yRange * 0.1);

    return {
      x: [
        Math.floor(xExtent[0] - xPadding),
        Math.ceil(xExtent[1] + xPadding),
      ] as [number, number],
      y: [
        Math.floor(yExtent[0] - yPadding),
        Math.ceil(yExtent[1] + yPadding),
      ] as [number, number],
    };
  }, [points]);

  const createChart = useCallback(() => {
    if (!svgRef.current || width <= 0 || height <= 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create main SVG with full dimensions
    const svg = d3
      .select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .style("cursor", isDragging ? "grabbing" : "default"); // Global cursor control

    // Create chart group
    const chartGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get smart domains
    const domains = getSmartDomain();

    // Create base scales
    const baseXScale = d3.scaleLinear().domain(domains.x).range([0, width]);

    const baseYScale = d3.scaleLinear().domain(domains.y).range([height, 0]);

    // Apply current transform to get actual scales
    const xScale = currentTransform.rescaleX(baseXScale);
    const yScale = currentTransform.rescaleY(baseYScale);

    // Create custom tick values (0, 2, 4, 6, 8...)
    const createCustomTicks = (domain: [number, number]): number[] => {
      const [min, max] = domain;
      const ticks: number[] = [];
      const start = Math.floor(min / 2) * 2;
      const step = Math.max(1, Math.ceil((max - min) / 20));
      const actualStep = step % 2 === 0 ? step : step + 1;

      for (let i = start; i <= max; i += actualStep) {
        ticks.push(i);
      }
      return ticks;
    };

    // Create axes with custom ticks
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(createCustomTicks(xScale.domain() as [number, number]))
      .tickFormat(d3.format("d"));

    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(createCustomTicks(yScale.domain() as [number, number]))
      .tickFormat(d3.format("d"));

    // Add grid lines
    chartGroup
      .append("g")
      .attr("class", "grid x-grid")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(createCustomTicks(xScale.domain() as [number, number]))
          .tickSize(-height)
          .tickFormat(() => "")
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    chartGroup
      .append("g")
      .attr("class", "grid y-grid")
      .call(
        d3
          .axisLeft(yScale)
          .tickValues(createCustomTicks(yScale.domain() as [number, number]))
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // Add axes
    chartGroup
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    chartGroup.append("g").attr("class", "y-axis").call(yAxis);

    // Add clickable background for adding points
    const background = chartGroup
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", isDragging ? "grabbing" : "crosshair");

    // Enhanced zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 50])
      .filter((event) => {
        // Disable zoom during point dragging
        return !isDragging;
      })
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { transform } = event;

        // Store the current transform
        setCurrentTransform(transform);

        // Update scales with new transform
        const newXScale = transform.rescaleX(baseXScale);
        const newYScale = transform.rescaleY(baseYScale);

        // Update axes
        chartGroup.select<SVGGElement>(".x-axis").call(
          d3
            .axisBottom(newXScale)
            .tickValues(
              createCustomTicks(newXScale.domain() as [number, number])
            )
            .tickFormat(d3.format("d"))
        );

        chartGroup.select<SVGGElement>(".y-axis").call(
          d3
            .axisLeft(newYScale)
            .tickValues(
              createCustomTicks(newYScale.domain() as [number, number])
            )
            .tickFormat(d3.format("d"))
        );

        // Update grid
        chartGroup.select<SVGGElement>(".x-grid").call(
          d3
            .axisBottom(newXScale)
            .tickValues(
              createCustomTicks(newXScale.domain() as [number, number])
            )
            .tickSize(-height)
            .tickFormat(() => "")
        );

        chartGroup.select<SVGGElement>(".y-grid").call(
          d3
            .axisLeft(newYScale)
            .tickValues(
              createCustomTicks(newYScale.domain() as [number, number])
            )
            .tickSize(-width)
            .tickFormat(() => "")
        );

        // Update points (only if not dragging)
        if (!isDragging) {
          chartGroup
            .selectAll<SVGCircleElement, Point>(".point")
            .attr("cx", (d: Point) => newXScale(d.x))
            .attr("cy", (d: Point) => newYScale(d.y));
        }
      });

    // Apply zoom to SVG with current transform
    svg.call(zoom).call(zoom.transform, currentTransform);

    // Handle background clicks to add points
    background.on("click", function (event: MouseEvent) {
      if (event.defaultPrevented || isDragging) return; // Ignore drag

      const [mouseX, mouseY] = d3.pointer(event, this);

      const x = Math.round(xScale.invert(mouseX));
      const y = Math.round(yScale.invert(mouseY));

      const newId = `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      dispatch(addPoint({ x, y, id: newId }));
    });

    // Enhanced drag behavior with persistent cursor and hover
    const drag = d3
      .drag<SVGCircleElement, Point>()
      .on(
        "start",
        function (
          event: d3.D3DragEvent<SVGCircleElement, Point, Point>,
          d: Point
        ) {
          event.sourceEvent.stopPropagation(); // Prevent zoom/pan
          setIsDragging(true);
          setDraggedPointId(d.id);

          // Visual feedback for drag start
          d3.select(this)
            .raise() // Bring to front
            .attr("r", 10) // Enlarge during drag
            .attr("stroke-width", 3)
            .attr("fill", "#ff6b6b") // Change color during drag
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))") // Add shadow
            .style("cursor", "grabbing !important"); // Force cursor

          // Set global cursor on SVG and body to ensure it persists
          svg.style("cursor", "grabbing !important");
          d3.select("body").style("cursor", "grabbing !important");

          // Initialize drag coordinates
          const startX = Math.round(xScale.invert(event.x));
          const startY = Math.round(yScale.invert(event.y));
          setCurrentDragCoords({ x: startX, y: startY });
        }
      )
      .on(
        "drag",
        function (
          event: d3.D3DragEvent<SVGCircleElement, Point, Point>,
          d: Point
        ) {
          // Get current mouse position in chart coordinates
          const [mouseX, mouseY] = [event.x, event.y];

          // Constrain to chart bounds
          const constrainedX = Math.max(0, Math.min(width, mouseX));
          const constrainedY = Math.max(0, Math.min(height, mouseY));

          // Update visual position immediately for smooth dragging
          d3.select(this)
            .attr("cx", constrainedX)
            .attr("cy", constrainedY)
            .style("cursor", "grabbing !important"); // Maintain cursor

          // Calculate data coordinates
          const newX = Math.round(xScale.invert(constrainedX));
          const newY = Math.round(yScale.invert(constrainedY));

          // Update current drag coordinates for tooltip
          setCurrentDragCoords({ x: newX, y: newY });

          // Update Redux store (throttled for performance)
          dispatch(updatePoint({ id: d.id, x: newX, y: newY }));
        }
      )
      .on(
        "end",
        function (
          event: d3.D3DragEvent<SVGCircleElement, Point, Point>,
          d: Point
        ) {
          setIsDragging(false);
          setDraggedPointId(null);
          setCurrentDragCoords(null);

          // Reset visual feedback
          d3.select(this)
            .attr("r", d.id === hoveredId ? 8 : 6) // Reset size
            .attr("stroke-width", 2)
            .attr("fill", d.id === hoveredId ? "#4ecdc4" : "#8884d8") // Reset color
            .style("filter", null) // Remove shadow
            .style("cursor", "grab"); // Reset cursor

          // Reset global cursors
          svg.style("cursor", "default");
          d3.select("body").style("cursor", "default");
          background.style("cursor", "crosshair");

          // Final position update to ensure accuracy
          const finalX = Math.round(xScale.invert(event.x));
          const finalY = Math.round(yScale.invert(event.y));
          dispatch(updatePoint({ id: d.id, x: finalX, y: finalY }));
        }
      );

    // Add points with enhanced styling
    const pointsGroup = chartGroup.append("g").attr("class", "points");

    const pointsSelection = pointsGroup
      .selectAll<SVGCircleElement, Point>(".point")
      .data(points, (d: Point) => d.id);

    // Remove old points
    pointsSelection.exit().remove();

    // Add new points
    const newPoints = pointsSelection
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("r", 6)
      .attr("cx", (d: Point) => xScale(d.x))
      .attr("cy", (d: Point) => yScale(d.y))
      .style("cursor", "grab")
      .style("transition", "all 0.2s ease") // Smooth transitions
      .call(drag);

    // Update all points with enhanced styling
    const allPoints = pointsSelection.merge(newPoints);

    allPoints
      .attr("cx", (d: Point) => xScale(d.x))
      .attr("cy", (d: Point) => yScale(d.y))
      .attr("fill", (d: Point) => {
        if (d.id === draggedPointId) return "#ff6b6b"; // Red while dragging
        if (d.id === hoveredId) return "#4ecdc4";
        return "#8884d8"; // Default blue
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", (d: Point) => (d.id === draggedPointId ? 3 : 2))
      .attr("r", (d: Point) => {
        if (d.id === draggedPointId) return 10; // Larger while dragging
        if (d.id === hoveredId) return 8; // Medium when hovered
        return 6; // Default size
      })
      .style("filter", (d: Point) =>
        d.id === draggedPointId
          ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
          : null
      )
      .style("cursor", (d: Point) =>
        d.id === draggedPointId ? "grabbing !important" : "grab"
      )
      .on("mouseenter", function (event: MouseEvent, d: Point) {
        if (!isDragging) {
          dispatch(setHovered(d.id));
          d3.select(this).attr("r", 8).style("cursor", "grab");
        }
      })
      .on("mouseleave", function (event: MouseEvent, d: Point) {
        if (!isDragging && d.id !== draggedPointId) {
          dispatch(setHovered(null));
          d3.select(this).attr("r", 6);
        }
      });

    // Enhanced tooltip with persistent drag information
    const tooltip = d3
      .select("body")
      .selectAll<HTMLDivElement, null>(".d3-tooltip")
      .data([null])
      .join("div")
      .attr("class", "d3-tooltip")
      .style("position", "fixed") // Use fixed positioning for better tracking
      .style("background", "rgba(0, 0, 0, 0.95)")
      .style("color", "white")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("font-family", "monospace")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 10000) // Very high z-index
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.4)")
      .style("border", "2px solid rgba(255,255,255,0.3)")
      .style("backdrop-filter", "blur(5px)");

    // Persistent tooltip during dragging
    if (isDragging && currentDragCoords) {
      tooltip.style("opacity", 1).html(`
           <strong>DRAGGING POINT</strong><br>
           Current: (${currentDragCoords.x}, ${currentDragCoords.y})<br>
           ID: ${draggedPointId}<br>
           Release to place
        `);

      // Update tooltip position continuously during drag
      const updateTooltipPosition = (event: MouseEvent) => {
        if (isDragging) {
          tooltip
            .style("left", (event.pageX || 0) + 20 + "px")
            .style("top", (event.pageY || 0) - 10 + "px");
        }
      };

      // Track mouse movement for tooltip positioning during drag
      svg.on("mousemove.tooltip", updateTooltipPosition);
    } else {
      svg.on("mousemove.tooltip", null); // Remove tracker when not dragging
    }

    allPoints
      .on("mouseover", function (event: MouseEvent, d: Point) {
        if (!isDragging) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(
              `
             Point: (${d.x}, ${d.y})<br>
             ID: ${d.id}<br>
             Click and drag to move<br>
             Hover to highlight
          `
            )
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 10 + "px");
        }
      })
      .on("mouseout", function (event: MouseEvent, d: Point) {
        if (!isDragging) {
          tooltip.transition().duration(200).style("opacity", 0);
        }
      });

    // Mouse movement tracker for drag tooltip positioning
    if (isDragging) {
      svg.on("mousemove.dragtooltip", function (event: MouseEvent) {
        if (currentDragCoords) {
          tooltip
            .style("left", event.pageX + 20 + "px")
            .style("top", event.pageY - 10 + "px");
        }
      });
    }

    // Enhanced zoom controls
    if (!containerRef.current) return;

    const controls = d3
      .select(containerRef.current)
      .selectAll<HTMLDivElement, null>(".zoom-controls")
      .data([null])
      .join("div")
      .attr("class", "zoom-controls")
      .style("position", "absolute")
      .style("top", "10px")
      .style("right", "10px")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("gap", "5px")
      .style("opacity", isDragging ? "0.3" : "1") // Dim during drag
      .style("pointer-events", isDragging ? "none" : "auto"); // Disable during drag

    // Control buttons with better styling
    const buttonStyle = {
      padding: "8px 12px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "bold",
      transition: "all 0.2s ease",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    };

    controls
      .selectAll<HTMLButtonElement, null>(".zoom-in")
      .data([null])
      .join("button")
      .attr("class", "zoom-in")
      .text("+ Zoom In")
      .style("background", "#007bff")
      .style("color", "white")
      .each(function () {
        Object.assign(this.style, buttonStyle);
      })
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.5);
      });

    controls
      .selectAll<HTMLButtonElement, null>(".zoom-out")
      .data([null])
      .join("button")
      .attr("class", "zoom-out")
      .text("- Zoom Out")
      .style("background", "#007bff")
      .style("color", "white")
      .each(function () {
        Object.assign(this.style, buttonStyle);
      })
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.67);
      });

    controls
      .selectAll<HTMLButtonElement, null>(".fit-points")
      .data([null])
      .join("button")
      .attr("class", "fit-points")
      .text("Fit All Points")
      .style("background", "#17a2b8")
      .style("color", "white")
      .each(function () {
        Object.assign(this.style, buttonStyle);
      })
      .on("click", () => {
        if (points.length > 0) {
          setCurrentTransform(d3.zoomIdentity);
          svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        }
      });

    controls
      .selectAll<HTMLButtonElement, null>(".zoom-reset")
      .data([null])
      .join("button")
      .attr("class", "zoom-reset")
      .text("Reset View")
      .style("background", "#28a745")
      .style("color", "white")
      .each(function () {
        Object.assign(this.style, buttonStyle);
      })
      .on("click", () => {
        setCurrentTransform(d3.zoomIdentity);
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      });
  }, [
    points,
    hoveredId,
    dispatch,
    getSmartDomain,
    width,
    height,
    dimensions,
    currentTransform,
    isDragging,
    draggedPointId,
    currentDragCoords,
  ]);

  // Create/update chart when dependencies change
  useEffect(() => {
    createChart();
  }, [createChart]);

  // Cleanup global cursor on component unmount
  useEffect(() => {
    return () => {
      d3.select("body").style("cursor", "default");
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "400px",
        display: "flex",
        flexDirection: "column",
        cursor: isDragging ? "grabbing" : "default", // Container cursor
      }}
    >
      <h3
        style={{
          margin: "10px 0",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        Points Graph (D3.js)
      </h3>
      <div style={{ flex: 1, position: "relative" }}>
        <svg
          ref={svgRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            cursor: isDragging ? "grabbing" : "default",
          }}
        ></svg>
      </div>
    </div>
  );
}
