const { COLORS } = require('./types')

// Check if a set of tiles forms a valid group (same number, different colors)
function isValidGroup(tiles) {
  if (tiles.length < 3 || tiles.length > 4) return false
  const nonJokers = tiles.filter(t => !t.isJoker)
  if (nonJokers.length === 0) return false

  const targetNumber = nonJokers[0].number
  if (!nonJokers.every(t => t.number === targetNumber)) return false

  const colors = new Set(nonJokers.map(t => t.color))
  if (colors.size !== nonJokers.length) return false

  return true
}

// Check if a set of tiles forms a valid run (consecutive numbers, same color)
function isValidRun(tiles) {
  if (tiles.length < 3) return false
  const nonJokers = tiles.filter(t => !t.isJoker)
  if (nonJokers.length === 0) return false

  const color = nonJokers[0].color
  if (!nonJokers.every(t => t.color === color)) return false

  // Sort non-jokers by number
  const sorted = [...nonJokers].sort((a, b) => a.number - b.number)

  // Check we can fill gaps with jokers
  let jokersAvailable = tiles.length - nonJokers.length
  const minNum = sorted[0].number
  const maxNum = sorted[sorted.length - 1].number
  const rangeNeeded = maxNum - minNum + 1

  if (rangeNeeded > tiles.length) return false
  if (rangeNeeded < tiles.length) {
    // Extra tiles - check if we can extend the run
    const extend = tiles.length - rangeNeeded
    // jokers can extend at either end
    if (minNum - extend < 1 && maxNum + extend > 13) return false
  }

  // Verify no duplicate numbers among non-jokers
  const nums = sorted.map(t => t.number)
  if (new Set(nums).size !== nums.length) return false

  // Check gaps can be filled by jokers
  let jokersUsed = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].number - sorted[i - 1].number - 1
    jokersUsed += gap
  }

  // Remaining jokers extend the run
  const remainingJokers = jokersAvailable - jokersUsed
  if (remainingJokers < 0) return false

  // Check bounds (1-13)
  const extendLeft = Math.min(remainingJokers, minNum - 1)
  const extendRight = remainingJokers - extendLeft
  if (maxNum + extendRight > 13 && minNum - remainingJokers < 1) {
    // Try all left
    if (minNum - remainingJokers < 1 && maxNum + remainingJokers > 13) return false
  }

  return true
}

function isValidSet(tiles) {
  if (!tiles || tiles.length < 3) return false
  return isValidGroup(tiles) || isValidRun(tiles)
}

function validateBoard(boardSets) {
  return boardSets.every(set => isValidSet(set))
}

function calculateSetPoints(tiles) {
  return tiles.reduce((sum, t) => sum + (t.isJoker ? 30 : t.number), 0)
}

function calculateInitialMeldPoints(sets) {
  return sets.reduce((sum, set) => sum + calculateSetPoints(set), 0)
}

module.exports = { isValidSet, validateBoard, calculateSetPoints, calculateInitialMeldPoints }
