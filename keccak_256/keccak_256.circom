pragma circom 2.0.0;

include "./keccak.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

// Keccak256 Hash Verification Circuit
// This circuit verifies that keccak256(preimage) == hash
//
// Public inputs:
//   - hash: The expected Keccak-256 hash (256 bits)
// Private inputs:
//   - preimage: The preimage to be hashed (256 bits / 32 bytes)
template Keccak256Verify() {
    // Input size: 256 bits (32 bytes)
    var nBitsIn = 256;
    // Output size: 256 bits (Keccak-256)
    var nBitsOut = 256;

    // Public input: expected hash (256 bits)
    signal input hash[nBitsOut];

    // Private input: preimage (256 bits)
    signal input preimage[nBitsIn];

    // Compute Keccak-256 hash of preimage
    component keccak = Keccak(nBitsIn, nBitsOut);
    for (var i = 0; i < nBitsIn; i++) {
        keccak.in[i] <== preimage[i];
    }

    // Verify that computed hash matches expected hash
    // Each bit of the computed hash must equal the corresponding bit of the expected hash
    for (var i = 0; i < nBitsOut; i++) {
        hash[i] === keccak.out[i];
    }
}

component main {public [hash]} = Keccak256Verify();
