export const DEFAULT_CAMERA_POSITION = [-481, 476, 832]
export const DEFAULT_CAMERA_LOOK_AT = [0, 200, 0]

export const INTRO_DISTANCE = 108000
export const INTRO_CAMERA_POSITION = (() => {
  const [px, py, pz] = DEFAULT_CAMERA_POSITION
  const [lx, ly, lz] = DEFAULT_CAMERA_LOOK_AT
  const dx = px - lx, dy = py - ly, dz = pz - lz
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
  return [lx + (dx / len) * INTRO_DISTANCE, ly + (dy / len) * INTRO_DISTANCE, lz + (dz / len) * INTRO_DISTANCE]
})()

export const CAMERA_FOV = 50

export const ROOM_WIDTH = 675
export const ROOM_HEIGHT = 525
export const EDGE_THICKNESS = 10
export const BASEBOARD_HEIGHT = 18
export const BASEBOARD_THICKNESS = 3
export const BASEBOARD_CAP_HEIGHT = 3
export const BASEBOARD_CAP_OVERHANG = 1
