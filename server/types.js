// Tile colors and structure
const COLORS = ['red', 'blue', 'black', 'orange']
const TILES_PER_COLOR = 13
const JOKER_COUNT = 2

function createTilePool() {
  const tiles = []
  let id = 0
  for (let copy = 0; copy < 2; copy++) {
    for (const color of COLORS) {
      for (let num = 1; num <= TILES_PER_COLOR; num++) {
        tiles.push({ id: id++, color, number: num, isJoker: false })
      }
    }
  }
  for (let i = 0; i < JOKER_COUNT; i++) {
    tiles.push({ id: id++, color: 'joker', number: 0, isJoker: true })
  }
  return tiles
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

module.exports = { COLORS, createTilePool, shuffle }
