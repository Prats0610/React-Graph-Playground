import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import * as d3 from "d3";
import type { RootState } from "../../store";
import { addPoint, updatePoint, setHovered } from "../../store/pointsSlice";

interface Point {
  id: string;
  x: number;
  y: number;
  offsetX?: number;
  offsetY?: number;
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

  // Debounced add point function to prevent rapid re-renders
  const addPointDebounced = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (point: Point) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => dispatch(addPoint(point)), 50);
    };
  }, [dispatch]);

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
    try {
      if (!svgRef.current || width <= 0 || height <= 0) return;

      // Clear previous chart
      d3.select(svgRef.current).selectAll("*").remove();

      // Create main SVG with full dimensions
      const svg = d3
        .select(svgRef.current)
        .attr("width", dimensions.width)
        .attr("height", dimensions.height);

      // Create chart group
      const chartGroup = svg
        .append("g")
        .attr("class", "chart-group")
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
        .attr("class", "chart-background")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .style("pointer-events", "all");

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
        if (event.defaultPrevented || isDragging) return;

        const [mouseX, mouseY] = d3.pointer(event, this);

        // Validate scales before inversion to prevent NaN values
        const x =
          xScale.domain()[0] !== xScale.domain()[1]
            ? Math.round(xScale.invert(mouseX))
            : Math.round(mouseX);

        const y =
          yScale.domain()[0] !== yScale.domain()[1]
            ? Math.round(yScale.invert(mouseY))
            : Math.round(mouseY);

        const newId = `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Use debounced add point to prevent rapid re-renders
        addPointDebounced({ x, y, id: newId });
      });

      const drag = d3
        .drag<SVGCircleElement, Point>()
        .subject(function (event: any, d: Point) {
          // Return the current screen position of the element for proper offset calculation
          return {
            x: xScale(d.x),
            y: yScale(d.y),
          };
        })
        .on(
          "start",
          function (
            event: d3.D3DragEvent<SVGCircleElement, Point, Point>,
            d: Point
          ) {
            event.sourceEvent.stopPropagation();
            setIsDragging(true);
            setDraggedPointId(d.id);

            // Clear hover state when dragging starts
            dispatch(setHovered(null));

            const pointer = d3.pointer(event.sourceEvent, chartGroup.node());
            const currentX = xScale(d.x);
            const currentY = yScale(d.y);

            d.offsetX = pointer[0] - currentX;
            d.offsetY = pointer[1] - currentY;

            d3.select(this)
              .raise()
              .attr("r", 10)
              .attr("stroke-width", 3)
              .attr("fill", "#ff6b6b")
              .style(
                "filter",
                "drop-shadow(0 4px 8px rgba(129, 125, 125, 0.3))"
              )
              .style("cursor", "grabbing");

            setCurrentDragCoords({ x: d.x, y: d.y });
          }
        )
        .on(
          "drag",
          function (
            event: d3.D3DragEvent<SVGCircleElement, Point, Point>,
            d: Point
          ) {
            let elementX = event.x - (d.offsetX || 0);
            let elementY = event.y - (d.offsetY || 0);

            // Constrain to chart bounds
            elementX = Math.max(0, Math.min(width, elementX));
            elementY = Math.max(0, Math.min(height, elementY));

            // Update visual position immediately
            d3.select(this).attr("cx", elementX).attr("cy", elementY);

            // Calculate data coordinates with scale validation
            const newX =
              xScale.domain()[0] !== xScale.domain()[1]
                ? Math.round(xScale.invert(elementX))
                : Math.round(elementX);

            const newY =
              yScale.domain()[0] !== yScale.domain()[1]
                ? Math.round(yScale.invert(elementY))
                : Math.round(elementY);

            // Update current drag coordinates for tooltip
            setCurrentDragCoords({ x: newX, y: newY });

            // Throttle Redux updates to reduce frequency
            if (!(this as any)._throttleTimeout) {
              (this as any)._throttleTimeout = setTimeout(() => {
                dispatch(updatePoint({ id: d.id, x: newX, y: newY }));
                (this as any)._throttleTimeout = null;
              }, 16); // ~60fps
            }
          }
        )
        .on(
          "end",
          function (
            event: d3.D3DragEvent<SVGCircleElement, Point, Point>,
            d: Point
          ) {
            // Clear throttle
            if ((this as any)._throttleTimeout) {
              clearTimeout((this as any)._throttleTimeout);
              (this as any)._throttleTimeout = null;
            }

            setIsDragging(false);
            setDraggedPointId(null);
            setCurrentDragCoords(null);

            // **Clean up offset properties**
            delete d.offsetX;
            delete d.offsetY;

            // Reset visual feedback
            d3.select(this)
              .attr("r", d.id === hoveredId ? 8 : 6)
              .attr("stroke-width", 2)
              .attr("fill", d.id === hoveredId ? "#4ecdc4" : "#8884d8")
              .style("filter", null)
              .style("cursor", "grab");

            // Final position update with scale validation
            const finalX =
              xScale.domain()[0] !== xScale.domain()[1]
                ? Math.round(xScale.invert(event.x - (d.offsetX || 0)))
                : Math.round(event.x);

            const finalY =
              yScale.domain()[0] !== yScale.domain()[1]
                ? Math.round(yScale.invert(event.y - (d.offsetY || 0)))
                : Math.round(event.y);

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
        .style("transition", "all 0.2s ease")
        .call(drag);

      // Update all points with enhanced styling
      const allPoints = pointsSelection.merge(newPoints);

      allPoints
        .attr("cx", (d: Point) => xScale(d.x))
        .attr("cy", (d: Point) => yScale(d.y))
        .attr("data-id", (d: Point) => d.id)
        .attr("fill", (d: Point) => {
          if (d.id === draggedPointId) return "#ff6b6b";
          if (d.id === hoveredId) return "#4ecdc4";
          return "#8884d8";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", (d: Point) => (d.id === draggedPointId ? 3 : 2))
        .attr("r", (d: Point) => {
          if (d.id === draggedPointId) return 10;
          if (d.id === hoveredId) return 8;
          return 6;
        })
        .style("filter", (d: Point) =>
          d.id === draggedPointId
            ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
            : null
        )
        .style("cursor", "grab")
        .on("mouseenter", function (event: MouseEvent, d: Point) {
          if (!isDragging) {
            dispatch(setHovered(d.id));
            d3.select(this).attr("r", 8);
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
        .style("position", "fixed")
        .style("background", "rgba(0, 0, 0, 0.95)")
        .style("color", "white")
        .style("padding", "12px")
        .style("border-radius", "8px")
        .style("font-size", "13px")
        .style("font-family", "monospace")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 10000)
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

        const updateTooltipPosition = (event: MouseEvent) => {
          if (isDragging) {
            tooltip
              .style("left", (event.pageX || 0) + 20 + "px")
              .style("top", (event.pageY || 0) - 10 + "px");
          }
        };

        svg.on("mousemove.tooltip", updateTooltipPosition);
      } else {
        svg.on("mousemove.tooltip", null);
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
        .style("opacity", isDragging ? "0.6" : "1")
        .style("pointer-events", isDragging ? "none" : "auto");

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
            svg
              .transition()
              .duration(500)
              .call(zoom.transform, d3.zoomIdentity);
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
    } catch (error) {
      console.error("Chart creation failed:", error);
    }
  }, [
    points,
    hoveredId,
    dispatch,
    getSmartDomain,
    width,
    height,
    dimensions,
    currentTransform,
    addPointDebounced,
  ]);

  // Create/update chart when dependencies change
  useEffect(() => {
    createChart();
  }, [createChart]);

  useEffect(() => {
    if (!svgRef.current) return;

    const background = d3.select(svgRef.current).select(".chart-background");
    if (!background.empty()) {
      background.style("cursor", isDragging ? "grabbing" : "crosshair");
    }
  }, [isDragging]);

  // Clean up event handlers and prevent memory leaks
  useEffect(() => {
    const svg = svgRef.current;
    return () => {
      if (svg) {
        d3.select(svg).on("mousemove.tooltip", null);
        d3.select(svg).on("mousemove.dragtooltip", null);
      }
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
        cursor: "default",
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
            cursor: "default",
          }}
        ></svg>
      </div>
    </div>
  );
}
