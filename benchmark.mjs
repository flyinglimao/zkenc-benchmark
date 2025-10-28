import { encrypt, decrypt } from "zkenc-js";
import fs from "fs/promises";

const circuitFiles = {
  r1csBuffer: await fs.readFile("./sudoku/sudoku.r1cs"),
  wasmBuffer: await fs.readFile("./sudoku/sudoku_js/sudoku.wasm"),
  symContent: await fs.readFile("./sudoku/sudoku.sym", "utf-8"), // Symbol file required for encap
};
const input = JSON.parse(await fs.readFile("./sudoku/input.json", "utf-8"));

const message = new TextEncoder().encode("TEST MESSAGE");

const { ciphertext, key } = await encrypt(circuitFiles, input, message);

const decrypted = await decrypt(circuitFiles, ciphertext, input);

const decryptedMessage = new TextDecoder().decode(decrypted);
console.log(decryptedMessage);
