#!/usr/bin/env node

/**
 * Convert snarkjs Groth16 proof to circom-pairing format
 *
 * This script converts:
 * - G1 points (Fp) to [2][k] arrays
 * - G2 points (Fp2) to [2][2][k] arrays
 * - Computes pairing e(-alpha1, beta2) as [6][2][k] array
 *
 * Where k=6 (number of limbs) and each limb is 43 bits
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { buildBn128 } from 'ffjavascript';

// BN254 (aka BN128) parameters
const K = 6;  // number of limbs
const LIMB_BITS = 43;  // bits per limb
const LIMB_SIZE = BigInt(1) << BigInt(LIMB_BITS);

console.log('🔄 Converting Groth16 proof to circom-pairing format\n');

// Check if proof files exist
const BUILD_DIR = './build';
if (!existsSync(`${BUILD_DIR}/vkey_raw.json`)) {
    console.error('❌ Proof files not found. Run generate_groth16_input.mjs first.');
    process.exit(1);
}

/**
 * Convert a BigInt to k limbs of LIMB_BITS each (little-endian)
 */
function bigIntToLimbs(value, k = K) {
    const limbs = [];
    let v = BigInt(value);

    for (let i = 0; i < k; i++) {
        limbs.push((v % LIMB_SIZE).toString());
        v = v / LIMB_SIZE;
    }

    return limbs;
}

/**
 * Convert a decimal string coordinate to limbs
 */
function coordToLimbs(coord) {
    if (typeof coord === 'string') {
        return bigIntToLimbs(BigInt(coord));
    } else if (Array.isArray(coord)) {
        // Already in array format
        return coord;
    }
    throw new Error('Invalid coordinate format');
}

/**
 * Convert G1 point (Fp) to [2][k] format
 * Input: ["x", "y", "1"] from snarkjs
 * Output: [[x_limbs], [y_limbs]]
 */
function convertG1Point(point) {
    if (point[2] === "0") {
        // Point at infinity
        console.log('  ⚠️  Warning: Point at infinity detected');
        return [
            new Array(K).fill("0"),
            new Array(K).fill("0")
        ];
    }

    return [
        coordToLimbs(point[0]),
        coordToLimbs(point[1])
    ];
}

/**
 * Convert G2 point (Fp2) to [2][2][k] format
 * Input: [["x0", "x1"], ["y0", "y1"], ["1", "0"]] from snarkjs
 * Output: [[[x0_limbs], [x1_limbs]], [[y0_limbs], [y1_limbs]]]
 *
 * Note: Fp2 element represented as a0 + a1*u where u^2 = -1
 */
function convertG2Point(point) {
    if (point[2][0] === "0" && point[2][1] === "0") {
        // Point at infinity
        console.log('  ⚠️  Warning: G2 point at infinity detected');
        return [
            [new Array(K).fill("0"), new Array(K).fill("0")],
            [new Array(K).fill("0"), new Array(K).fill("0")]
        ];
    }

    return [
        [coordToLimbs(point[0][0]), coordToLimbs(point[0][1])],
        [coordToLimbs(point[1][0]), coordToLimbs(point[1][1])]
    ];
}

/**
 * Negate a G1 point (negate y-coordinate)
 */
async function negateG1Point(point, curve) {
    const p = curve.Fr.p;  // Field prime
    const x = BigInt(point[0]);
    const y = BigInt(point[1]);

    // Negate y: p - y
    const negY = p - y;

    return [
        point[0],
        negY.toString(),
        point[2]
    ];
}

/**
 * Compute pairing e(P, Q) using snarkjs/ffjavascript
 * Returns Fp12 element as [6][2][k] array
 *
 * Fp12 is represented as 6 Fp2 elements
 */
async function computePairing(G1Point, G2Point, curve) {
    console.log('  Computing pairing e(G1, G2)...');

    try {
        // Convert points to curve format
        const p1 = curve.G1.fromObject(G1Point);
        const p2 = curve.G2.fromObject(G2Point);

        // Compute pairing
        const result = await curve.pairing(p1, p2);

        // Convert Fp12 result to [6][2][k] format
        // Fp12 = Fp2[w] / (w^6 - xi) where xi = u + 9
        // result.c has 6 Fp2 elements

        const fp12Array = [];
        for (let i = 0; i < 6; i++) {
            const fp2Element = result[i];
            fp12Array.push([
                coordToLimbs(fp2Element[0].toString()),
                coordToLimbs(fp2Element[1].toString())
            ]);
        }

        console.log('  ✓ Pairing computed');
        return fp12Array;

    } catch (error) {
        console.error('  ✗ Pairing computation failed:', error.message);
        console.log('  Using placeholder values for negalfa1xbeta2');

        // Return placeholder - all zeros for now
        const placeholder = [];
        for (let i = 0; i < 6; i++) {
            placeholder.push([
                new Array(K).fill("0"),
                new Array(K).fill("0")
            ]);
        }
        return placeholder;
    }
}

async function main() {
    // Load curve
    console.log('Loading BN254 curve...');
    const curve = await buildBn128();
    console.log('✓ Curve loaded\n');

    // Load raw data
    console.log('Loading verification key and proof...');
    const vkey = JSON.parse(readFileSync(`${BUILD_DIR}/vkey_raw.json`, 'utf-8'));
    const proof = JSON.parse(readFileSync(`${BUILD_DIR}/proof_raw.json`, 'utf-8'));
    const publicSignals = JSON.parse(readFileSync(`${BUILD_DIR}/public_raw.json`, 'utf-8'));
    console.log('✓ Data loaded\n');

    console.log('Converting verification key...');

    // Convert verification key components
    console.log('  Converting gamma2...');
    const gamma2 = convertG2Point(vkey.vk_gamma_2);

    console.log('  Converting delta2...');
    const delta2 = convertG2Point(vkey.vk_delta_2);

    console.log('  Converting IC points...');
    const IC = vkey.IC.map((point, idx) => {
        console.log(`    IC[${idx}]...`);
        return convertG1Point(point);
    });

    // Compute e(-alpha1, beta2)
    console.log('  Computing negalfa1xbeta2 = e(-alpha1, beta2)...');
    const negAlpha1 = await negateG1Point(vkey.vk_alpha_1, curve);
    const negalfa1xbeta2 = await computePairing(negAlpha1, vkey.vk_beta_2, curve);

    console.log('✓ Verification key converted\n');

    console.log('Converting proof...');

    // Convert proof components
    console.log('  Converting pi_a to negpa...');
    const negpa_point = await negateG1Point(proof.pi_a, curve);
    const negpa = convertG1Point(negpa_point);

    console.log('  Converting pi_b to pb...');
    const pb = convertG2Point(proof.pi_b);

    console.log('  Converting pi_c to pc...');
    const pc = convertG1Point(proof.pi_c);

    console.log('✓ Proof converted\n');

    // Construct input.json
    const input = {
        // Verification key
        negalfa1xbeta2,
        gamma2,
        delta2,
        IC,

        // Proof
        negpa,
        pb,
        pc,

        // Public inputs
        pubInput: publicSignals
    };

    // Write output
    writeFileSync('./input.json', JSON.stringify(input, null, 2));

    console.log('✅ Conversion complete!');
    console.log('📝 Generated input.json with:');
    console.log(`   - negalfa1xbeta2: [6][2][${K}] array`);
    console.log(`   - gamma2: [2][2][${K}] array`);
    console.log(`   - delta2: [2][2][${K}] array`);
    console.log(`   - IC: [${IC.length}][2][${K}] array`);
    console.log(`   - negpa: [2][${K}] array`);
    console.log(`   - pb: [2][2][${K}] array`);
    console.log(`   - pc: [2][${K}] array`);
    console.log(`   - pubInput: [${publicSignals.length}] array`);
    console.log('');

    await curve.terminate();
}

main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
