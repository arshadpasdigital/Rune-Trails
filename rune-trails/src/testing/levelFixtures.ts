export function validDoc(): Record<string, unknown> {
  return {
    id: "test-3x3",
    name: "Test",
    width: 3,
    height: 3,
    pairs: [
      {
        id: 1,
        element: "fire",
        endpoints: [
          { x: 0, y: 0 },
          { x: 2, y: 1 },
        ],
      },
      {
        id: 2,
        element: "water",
        endpoints: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      },
    ],
    terrain: [],
    hazardScript: [],
  };
}
