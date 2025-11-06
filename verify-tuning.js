// Verify note frequencies against standard equal temperament tuning
const A4 = 440;

// Calculate frequency for any note
function calcFreq(note, octave) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = notes.indexOf(note);
  const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9);
  return A4 * Math.pow(2, semitonesFromA4 / 12);
}

// Test notes from the synth
const testNotes = [
  ['C', 2, 65.41],
  ['C#', 2, 69.30],
  ['D', 2, 73.42],
  ['D#', 2, 77.78],
  ['E', 2, 82.41],
  ['F', 2, 87.31],
  ['F#', 2, 92.50],
  ['G', 2, 98.00],
  ['G#', 2, 103.83],
  ['A', 2, 110.00],
  ['A#', 2, 116.54],
  ['B', 2, 123.47],
  ['C', 3, 130.81],
  ['C#', 3, 138.59],
  ['D', 3, 146.83],
  ['D#', 3, 155.56],
  ['E', 3, 164.81],
  ['F', 3, 174.61],
  ['F#', 3, 185.00],
  ['G', 3, 196.00],
  ['G#', 3, 207.65],
  ['A', 3, 220.00],
  ['A#', 3, 233.08],
  ['B', 3, 246.94],
  ['C', 4, 261.63],
  ['C#', 4, 277.18],
  ['D', 4, 293.66],
  ['D#', 4, 311.13],
  ['E', 4, 329.63],
  ['F', 4, 349.23],
  ['F#', 4, 369.99],
  ['G', 4, 392.00],
  ['G#', 4, 415.30],
  ['A', 4, 440.00],
  ['A#', 4, 466.16],
  ['B', 4, 493.88],
  ['C', 5, 523.25],
];

console.log('Note  | Expected | Actual | Difference | Status');
console.log('------|----------|--------|------------|--------');

let allInTune = true;
testNotes.forEach(([note, oct, actual]) => {
  const expected = calcFreq(note, oct);
  const diff = actual - expected;
  const percentDiff = (diff / expected * 100);
  const status = Math.abs(percentDiff) < 0.1 ? '✓ OK' : '✗ OFF';
  
  if (Math.abs(percentDiff) >= 0.1) {
    allInTune = false;
  }
  
  console.log(`${note}${oct}`.padEnd(6) + 
              `| ${expected.toFixed(2).padEnd(8)} | ${actual.toFixed(2).padEnd(6)} | ${diff.toFixed(2).padStart(10)} | ${status}`);
});

console.log('\n' + (allInTune ? '✓ All notes are in tune!' : '✗ Some notes are out of tune'));
