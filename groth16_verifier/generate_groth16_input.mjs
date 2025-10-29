#!/usr/bin/env node

/**
 * Script to generate input.json for Groth16 verifier circuit
 *
 * This script:
 * 1. Compiles a simple multiplier circuit
 * 2. Generates a Groth16 proof for it
 * 3. Extracts verification key and proof
 * 4. Converts to circom-pairing format (BN254 curve with k=6 limbs)
 *
 * Note: The conversion to circom-pairing format is complex and requires
 * understanding of BN254 curve arithmetic and multi-precision representation.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

console.log('🚀 Generating Groth16 Verifier Input\n');

// Configuration
const CURVE = 'bn128'; // snarkjs uses bn128 which is same as BN254
const CIRCUIT_NAME = 'simple_multiplier';
const BUILD_DIR = './build';

// Create build directory
if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true });
}

console.log('Step 1: Compiling simple multiplier circuit...');
try {
    execSync(`circom ${CIRCUIT_NAME}.circom --r1cs --wasm --sym --output ${BUILD_DIR}`, {
        stdio: 'inherit',
        cwd: process.cwd()
    });
    console.log('✓ Circuit compiled\n');
} catch (error) {
    console.error('✗ Circuit compilation failed');
    process.exit(1);
}

console.log('Step 2: Generating Powers of Tau...');
try {
    // Start Powers of Tau ceremony
    execSync(`npx snarkjs powersoftau new ${CURVE} 12 ${BUILD_DIR}/pot12_0000.ptau`, {
        stdio: 'inherit'
    });

    // Contribute to ceremony
    execSync(`npx snarkjs powersoftau contribute ${BUILD_DIR}/pot12_0000.ptau ${BUILD_DIR}/pot12_0001.ptau --name="First contribution" -e="random text"`, {
        stdio: 'inherit'
    });

    // Prepare phase 2
    execSync(`npx snarkjs powersoftau prepare phase2 ${BUILD_DIR}/pot12_0001.ptau ${BUILD_DIR}/pot12_final.ptau`, {
        stdio: 'inherit'
    });

    console.log('✓ Powers of Tau generated\n');
} catch (error) {
    console.error('✗ Powers of Tau generation failed');
    process.exit(1);
}

console.log('Step 3: Generating Groth16 zkey...');
try {
    // Generate zkey
    execSync(`npx snarkjs groth16 setup ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs ${BUILD_DIR}/pot12_final.ptau ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey`, {
        stdio: 'inherit'
    });

    // Contribute to phase 2
    execSync(`npx snarkjs zkey contribute ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey --name="First contribution" -e="random text"`, {
        stdio: 'inherit'
    });

    // Export verification key
    execSync(`npx snarkjs zkey export verificationkey ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey ${BUILD_DIR}/verification_key.json`, {
        stdio: 'inherit'
    });

    console.log('✓ Groth16 zkey generated\n');
} catch (error) {
    console.error('✗ Groth16 setup failed');
    process.exit(1);
}

console.log('Step 4: Generating witness and proof...');
try {
    // Generate witness
    const input = JSON.parse(readFileSync('./simple_input.json', 'utf-8'));
    writeFileSync(`${BUILD_DIR}/input.json`, JSON.stringify(input));

    // Use snarkjs witness calculation (works with ESM)
    execSync(`npx snarkjs wtns calculate ${BUILD_DIR}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm ${BUILD_DIR}/input.json ${BUILD_DIR}/witness.wtns`, {
        stdio: 'inherit'
    });

    // Generate proof
    execSync(`npx snarkjs groth16 prove ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey ${BUILD_DIR}/witness.wtns ${BUILD_DIR}/proof.json ${BUILD_DIR}/public.json`, {
        stdio: 'inherit'
    });

    console.log('✓ Proof generated\n');
} catch (error) {
    console.error('✗ Proof generation failed');
    process.exit(1);
}

console.log('Step 5: Extracting and converting parameters...');
try {
    const vkey = JSON.parse(readFileSync(`${BUILD_DIR}/verification_key.json`, 'utf-8'));
    const proof = JSON.parse(readFileSync(`${BUILD_DIR}/proof.json`, 'utf-8'));
    const publicSignals = JSON.parse(readFileSync(`${BUILD_DIR}/public.json`, 'utf-8'));

    console.log('\n📋 Verification Key Structure:');
    console.log('  Protocol:', vkey.protocol);
    console.log('  Curve:', vkey.curve);
    console.log('  nPublic:', vkey.nPublic);
    console.log('  vk_alpha_1:', vkey.vk_alpha_1);
    console.log('  vk_beta_2:', vkey.vk_beta_2);
    console.log('  vk_gamma_2:', vkey.vk_gamma_2);
    console.log('  vk_delta_2:', vkey.vk_delta_2);
    console.log('  IC length:', vkey.IC.length);

    console.log('\n📋 Proof Structure:');
    console.log('  pi_a:', proof.pi_a);
    console.log('  pi_b:', proof.pi_b);
    console.log('  pi_c:', proof.pi_c);
    console.log('  Public signals:', publicSignals);

    console.log('\n⚠️  WARNING: Conversion to circom-pairing format is complex!');
    console.log('   The coordinates need to be converted to multi-precision format (k=6 limbs)');
    console.log('   and arranged according to BN254 field representation.');
    console.log('\n   For production use, you would need to:');
    console.log('   1. Parse G1/G2 points from the JSON');
    console.log('   2. Convert each coordinate to BigInt');
    console.log('   3. Split into k=6 limbs of 43 bits each');
    console.log('   4. Handle Fp2 elements (pairs of field elements)');
    console.log('   5. Compute pairing e(-alpha1, beta2) for negalfa1xbeta2');
    console.log('\n   See: https://github.com/yi-sun/circom-pairing for reference implementations');

    // Save raw data for manual conversion
    writeFileSync(`${BUILD_DIR}/vkey_raw.json`, JSON.stringify(vkey, null, 2));
    writeFileSync(`${BUILD_DIR}/proof_raw.json`, JSON.stringify(proof, null, 2));
    writeFileSync(`${BUILD_DIR}/public_raw.json`, JSON.stringify(publicSignals, null, 2));

    console.log('\n✓ Raw data saved to build/ directory');
    console.log('  - vkey_raw.json');
    console.log('  - proof_raw.json');
    console.log('  - public_raw.json');

} catch (error) {
    console.error('✗ Parameter extraction failed:', error.message);
    process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('🔄 CONVERTING TO CIRCOM-PAIRING FORMAT');
console.log('='.repeat(70));

try {
    console.log('\nRunning conversion script...\n');
    execSync('node convert_to_circom_pairing.mjs', {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUCCESS!');
    console.log('='.repeat(70));
    console.log('\nThe input.json file has been generated and is ready to use.');
    console.log('You can now compile the groth16_verifier circuit and run the benchmark.');
    console.log('');
} catch (error) {
    console.error('\n❌ Conversion failed:', error.message);
    console.log('\nThe raw proof files are still available in build/ directory.');
    console.log('You can try running: node convert_to_circom_pairing.mjs');
    process.exit(1);
}
