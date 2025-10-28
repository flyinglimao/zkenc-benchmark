import { decap, encap } from "zkenc-js";
import fs from "fs/promises";

const circuitFiles = {
  r1csBuffer: await fs.readFile("./sudoku/sudoku.r1cs"),
  wasmBuffer: await fs.readFile("./sudoku/sudoku_js/sudoku.wasm"),
  symContent: await fs.readFile("./sudoku/sudoku.sym", "utf-8"), // Symbol file required for encap
};
const input = JSON.parse(await fs.readFile("./sudoku/input.json", "utf-8"));

const { ciphertext } = await encap(circuitFiles, input);

const key = await decap(circuitFiles, ciphertext, input);

console.log(ciphertext, key);
