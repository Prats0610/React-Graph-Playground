Bonus: Login page

- Table and Graph.
- Popout modal.

Graph:

- Adding the points.
- Drag the points

Step 1: Understanding the Problem Statement

- Add points:

1. via modal
2. via clicking directly on the graph.

- Hover :

1. show x, y points

- Drag points :

1. update our state, graph and table.

- Table synchronization :

1. Shows list of points.
2. Editing the x.y points via a popup modal.

Step 2: Features Breakdown:

1. Graph Component (D3)

- Handle clicks - Add points
- Handles drag - update our redux
  (on hover, we can use an ID)

2. Table

- Read points from Redux
- Supports editing
- Additional : on hover over our row we can highlight point in the graph

3. Redux

- Actions: addPoint, updatePoint, hovered.

4. Tooltip

- Graph : show tooltip with coordinates.
- The state can be tracked using redux.

Step 3: Data Flow:

- Adding points:

1. Click -> cordinates -> dispatch addPoint
2. Redux updates -> Graph + Table

- Dragging points:
  research on D3

- Editing table

1. On change -> dispatch update
2. Redux update -> Graph gets updated

- Hover

1. graph hover -> dispatch hover update using an id
2. table hover -> dispatch hovev with an id -> enlarge the points on the graph.

Step 4: Architecture

1. src/store -> pointsSlice -> add, update , setHover(id)
2. src/components -> Graph, Table, Tooltip (we can have a custom tooltip)
3. App.tsx -> Layout includes Graph + Table
4. types of points( id, x, y)

Step 5: Technology

1. D3.js
2. Redux
3. MUI Table
4. Typescript

Step 6: Implementation Plan

1. Setup boilerplate
2. Implement Redux slice.
3. Implement Table -> Dispatch updates on edit
4. Implement the Graph -> Drag handler, Click handler, hover
5. Connecting hover state -> highlight both table and graph
6. Add a tooltip.

Key Challenges Faced:

1. D3.js Integration with React

- Complex state synchronization between D3 and React
- Memory leaks from D3 event handlers
- ResizeObserver compatibility issues
- Mouse Cursor interaction after dragging events in D3.js (facing lag after dragging the point)

Areas of Improvement

1. Adding testcase for all the components
2. Modular approach for components, can extract business logic into custom hooks, split large components
3. Data lost on page refresh.
4. D3 re-renders entire chart on every state change: Implement selective rendering
5. Add Error Boundaries.

Testing

1. The project includes comprehensive testing setup with:

- Unit Tests: Component logic and Redux state management
- Integration Tests: Component interaction with Redux store

Login cred:
email: pratishtha12@test.com
password: pratishtha
