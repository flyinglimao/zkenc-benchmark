#!/usr/bin/env node

import { decap, encap } from "zkenc-js";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

// 電路列表 - 在此處添加需要測試的電路
const CIRCUITS = [
  { name: "sudoku", path: "sudoku" },
  { name: "signature", path: "signature" },
  { name: "merkle_membership", path: "merkle_membership" },
  { name: "keccak_256", path: "keccak_256" },
  { name: "groth16_verifier", path: "groth16_verifier" },
];

/**
 * 從 R1CS 文件中提取約束數量
 */
async function getConstraintCount(r1csPath) {
  try {
    // 使用 snarkjs 的 r1cs info 命令
    const output = execSync(`npx snarkjs r1cs info "${r1csPath}"`, {
      encoding: "utf-8",
    });

    // 解析輸出中的約束數量
    const match = output.match(/# of Constraints:\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  } catch (error) {
    console.error(`無法獲取約束數量: ${error.message}`);
    return null;
  }
}

/**
 * 從 circom 文件中分析輸入輸出
 */
async function analyzeCircuitIO(circomPath) {
  try {
    const content = await fs.readFile(circomPath, "utf-8");

    // 查找 main component 定義以確定公開輸入
    const mainMatch = content.match(
      /component\s+main\s*\{public\s*\[([^\]]+)\]\}/
    );
    const publicInputs = mainMatch
      ? mainMatch[1].split(",").map((s) => s.trim())
      : [];

    // 查找所有 signal input 定義
    const inputMatches = content.matchAll(/signal\s+input\s+(\w+)(\[\d+\])?/g);
    const allInputs = [];

    for (const match of inputMatches) {
      const name = match[1];
      const isArray = match[2];
      allInputs.push({ name, isArray });
    }

    return { publicInputs, allInputs };
  } catch (error) {
    console.error(`無法分析電路 IO: ${error.message}`);
    return { publicInputs: [], allInputs: [] };
  }
}

/**
 * 計算輸入數量
 */
function countInputs(inputData, inputNames) {
  let count = 0;
  for (const name of inputNames) {
    if (name in inputData) {
      const value = inputData[name];
      count += Array.isArray(value) ? value.length : 1;
    }
  }
  return count;
}

/**
 * 對單個電路進行 benchmark
 */
async function benchmarkCircuit(circuit) {
  console.log(`\n📊 測試電路: ${circuit.name}`);

  const circuitPath = circuit.path;
  const circuitName = circuit.name;

  // 檢查必要文件是否存在
  const r1csPath = path.join(circuitPath, `${circuitName}.r1cs`);
  const wasmPath = path.join(
    circuitPath,
    `${circuitName}_js`,
    `${circuitName}.wasm`
  );
  const symPath = path.join(circuitPath, `${circuitName}.sym`);
  const inputPath = path.join(circuitPath, "input.json");
  const circomPath = path.join(circuitPath, `${circuitName}.circom`);

  try {
    await fs.access(r1csPath);
    await fs.access(wasmPath);
    await fs.access(symPath);
    await fs.access(inputPath);
  } catch (error) {
    console.error(`❌ 缺少必要文件，跳過此電路`);
    return null;
  }

  // 讀取文件
  const circuitFiles = {
    r1csBuffer: await fs.readFile(r1csPath),
    wasmBuffer: await fs.readFile(wasmPath),
    symContent: await fs.readFile(symPath, "utf-8"),
  };

  const input = JSON.parse(await fs.readFile(inputPath, "utf-8"));

  // 獲取約束數量
  console.log("  ⏳ 分析約束數量...");
  const constraintCount = await getConstraintCount(r1csPath);

  // 分析輸入輸出
  console.log("  ⏳ 分析電路 IO...");
  const { publicInputs, allInputs } = await analyzeCircuitIO(circomPath);

  const publicInputNames = publicInputs;
  const privateInputNames = allInputs
    .map((i) => i.name)
    .filter((name) => !publicInputs.includes(name));

  const publicInputCount = countInputs(input, publicInputNames);
  const privateInputCount = countInputs(input, privateInputNames);

  // 測量加密時間
  console.log("  ⏳ 測試加密...");
  const encryptStart = Date.now();
  const { ciphertext } = await encap(circuitFiles, input);
  const encryptTime = Date.now() - encryptStart;

  // 獲取 CipherText 大小
  const ciphertextSize = JSON.stringify(ciphertext).length;

  // 測量解密時間
  console.log("  ⏳ 測試解密...");
  const decryptStart = Date.now();
  await decap(circuitFiles, ciphertext, input);
  const decryptTime = Date.now() - decryptStart;

  console.log(`  ✅ ${circuit.name} 測試完成`);

  return {
    name: circuit.name,
    constraintCount,
    publicInputCount,
    privateInputCount,
    encryptTime,
    decryptTime,
    ciphertextSize,
  };
}

/**
 * 將結果輸出為 CSV
 */
function exportToCSV(results, outputPath) {
  const headers = [
    "Circuit Name",
    "Constraints",
    "Public Inputs",
    "Private Inputs",
    "Encrypt Time (ms)",
    "Decrypt Time (ms)",
    "Ciphertext Size (bytes)",
  ];

  const rows = results.map((r) => [
    r.name,
    r.constraintCount || "N/A",
    r.publicInputCount,
    r.privateInputCount,
    r.encryptTime,
    r.decryptTime,
    r.ciphertextSize,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return fs.writeFile(outputPath, csvContent, "utf-8");
}

/**
 * 主函數
 */
async function main() {
  console.log("🚀 zkenc-js Benchmark 開始");
  console.log(`📝 測試電路數量: ${CIRCUITS.length}`);

  const results = [];

  for (const circuit of CIRCUITS) {
    try {
      const result = await benchmarkCircuit(circuit);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`❌ 測試 ${circuit.name} 時發生錯誤:`, error.message);
    }
  }

  // 輸出結果
  const outputPath = "benchmark-results.csv";
  await exportToCSV(results, outputPath);

  console.log(`\n✅ Benchmark 完成！`);
  console.log(`📊 結果已保存至: ${outputPath}`);

  // 在控制台顯示結果摘要
  console.log("\n📈 結果摘要:");
  console.table(results);
}

main().catch(console.error);
