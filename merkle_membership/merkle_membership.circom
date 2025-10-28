pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

// Merkle Tree Membership Validation with EdDSA Signature Verification
// This circuit verifies that an EdDSA signature was created by a key
// that is a member of a Merkle tree.
//
// Public inputs:
//   - root: Merkle tree root
//   - message: The fixed message that was signed
//
// Private inputs:
//   - signature components (R8x, R8y, S)
//   - publicKey: the signer's public key (Ax, Ay)
//   - pathElements: Merkle proof path elements (depth 20)
//   - pathIndices: Merkle proof path indices (depth 20)
//
// The circuit verifies:
// 1. The EdDSA signature is valid for the given public key and message
// 2. The public key (as a leaf) is a member of the Merkle tree

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    component mux[levels];

    signal hashes[levels + 1];
    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // pathIndices[i] = 0 means current hash is left sibling
        // pathIndices[i] = 1 means current hash is right sibling
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        mux[i] = MultiMux1(2);
        mux[i].c[0][0] <== hashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== hashes[i];
        mux[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        hashes[i + 1] <== hashers[i].out;
    }

    root === hashes[levels];
}

template MerkleMembership() {
    // Merkle tree depth
    var DEPTH = 20;

    // Public inputs
    signal input root;                           // Merkle tree root
    signal input message;                        // The fixed message that was signed

    // Private inputs - EdDSA signature
    signal input R8x;                            // Signature R8 point x-coordinate
    signal input R8y;                            // Signature R8 point y-coordinate
    signal input S;                              // Signature S value
    signal input Ax;                             // Public key x-coordinate
    signal input Ay;                             // Public key y-coordinate

    // Private inputs - Merkle proof
    signal input pathElements[DEPTH];            // Merkle proof path elements
    signal input pathIndices[DEPTH];             // Merkle proof path indices (0 or 1)

    // Step 1: Verify the EdDSA signature
    component verifyEdDSA = EdDSAPoseidonVerifier();
    verifyEdDSA.enabled <== 1;
    verifyEdDSA.Ax <== Ax;
    verifyEdDSA.Ay <== Ay;
    verifyEdDSA.R8x <== R8x;
    verifyEdDSA.R8y <== R8y;
    verifyEdDSA.S <== S;
    verifyEdDSA.M <== message;

    // Step 2: Compute the leaf hash from the public key
    // The leaf is the hash of the public key coordinates
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== Ax;
    leafHasher.inputs[1] <== Ay;

    // Step 3: Verify the leaf is in the Merkle tree
    component merkleChecker = MerkleTreeChecker(DEPTH);
    merkleChecker.leaf <== leafHasher.out;
    merkleChecker.root <== root;
    for (var i = 0; i < DEPTH; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }
}

component main {public [root, message]} = MerkleMembership();
