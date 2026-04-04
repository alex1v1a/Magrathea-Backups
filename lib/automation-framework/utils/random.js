/**
 * Random utility functions
 */

/**
 * Generate random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float between min and max
 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Random boolean with given probability
 */
function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

/**
 * Pick random element from array
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sleep for random duration
 */
function randomSleep(min, max) {
  const delay = randomInt(min, max);
  return sleep(delay);
}

/**
 * Add jitter to a value
 */
function jitter(value, factor = 0.3) {
  const amount = value * factor;
  return value + (Math.random() * amount * 2 - amount);
}

module.exports = {
  randomInt,
  randomFloat,
  randomBool,
  randomChoice,
  shuffle,
  sleep,
  randomSleep,
  jitter
};
